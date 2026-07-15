const { authRequest, readRawBody } = require('../../lib/handlers');

module.exports.config = { api: { bodyParser: false } };

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).send(JSON.stringify({ error: 'method' }));
  try {
    const raw = await readRawBody(req);
    let input; try { input = JSON.parse(raw || '{}'); } catch (e) { return res.status(400).send(JSON.stringify({ error: 'json' })); }
    const r = await authRequest(input);
    res.status(r.status).send(JSON.stringify(r.body));
  } catch (e) {
    res.status(500).send(JSON.stringify({ error: 'serveur', message: e.message }));
  }
};
