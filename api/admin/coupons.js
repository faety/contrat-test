const { adminCoupons, readRawBody } = require('../../lib/handlers');

module.exports.config = { api: { bodyParser: false } };

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  const key = req.headers['x-admin-key'] || '';
  try {
    let body = {};
    if (req.method === 'POST') {
      const raw = await readRawBody(req);
      try { body = JSON.parse(raw || '{}'); } catch (e) { return res.status(400).send(JSON.stringify({ error: 'json' })); }
    }
    const r = await adminCoupons(req.method, body, key);
    res.status(r.status).send(JSON.stringify(r.body));
  } catch (e) {
    res.status(500).send(JSON.stringify({ error: 'serveur', message: e.message }));
  }
};
