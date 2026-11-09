const CATALOG = {
  "Seguidores de Instagram (1.000 seguidores)": 7000,
  "Seguidores de Instagram (2.000 seguidores)": 12000,
  "Seguidores de Instagram (3.000 seguidores)": 15000,
  "Likes de Instagram (1.000 likes)": 3000,
  "Likes de Instagram (2.000 likes)": 6000,
  "Likes de Instagram (3.000 likes)": 7000,
  "Seguidores de TikTok (1.000 seguidores)": 7000,
  "Seguidores de TikTok (2.000 seguidores)": 12000,
  "Seguidores de TikTok (3.000 seguidores)": 15000,
  "Likes de TikTok (1.000 likes)": 3000,
  "Likes de TikTok (2.000 likes)": 6000,
  "Likes de TikTok (3.000 likes)": 7000,
  "Netflix (1 mes · Entrega inmediata)": 4500,
  "Disney+ Premium (1 mes · Entrega inmediata)": 3000,
  "HBO Max (1 mes · Entrega inmediata)": 3000,
  "Vix (1 mes · Entrega inmediata)": 3000,
  "Plex (1 mes · Entrega inmediata)": 3000,
  "Canva (1 mes · Entrega inmediata)": 2500,
  "Crunchyroll (1 mes · Entrega inmediata)": 2500
};

const json = (code, body) => ({
  statusCode: code,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método no permitido' });
  if (!process.env.MP_ACCESS_TOKEN) return json(500, { error: 'Falta MP_ACCESS_TOKEN' });

  let data;
  try { data = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Datos inválidos' }); }

  const name = String(data.name || '').trim().slice(0, 120);
  const delivery = String(data.delivery || '').trim().slice(0, 300);
  if (!name || !delivery) return json(400, { error: 'Faltan datos de entrega' });
  if (!Array.isArray(data.items) || !data.items.length || data.items.length > 60)
    return json(400, { error: 'Carrito inválido' });

  const items = [];
  for (const it of data.items) {
    const price = CATALOG[it.n];
    const qty = parseInt(it.q, 10);
    if (!price || !(qty >= 1 && qty <= 100)) return json(400, { error: 'Producto inválido' });
    items.push({ title: it.n.slice(0, 250), quantity: qty, unit_price: price, currency_id: 'CLP' });
  }

  const site = (process.env.SITE_URL || process.env.URL || event.headers.origin || '').replace(/\/$/, '');
  const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.MP_ACCESS_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items,
      payer: { name },
      back_urls: {
        success: site + '/?pago=ok',
        pending: site + '/?pago=pendiente',
        failure: site + '/?pago=error',
      },
      auto_return: 'approved',
      statement_descriptor: 'BEIZE AGENCY',
      external_reference: 'beize-' + Date.now(),
      metadata: { name, delivery },
      payment_methods: { excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }] },
    }),
  });

  const pref = await res.json();
  if (!res.ok || !pref.init_point) return json(502, { error: 'No se pudo crear el pago' });
  return json(200, { url: pref.init_point });
};

