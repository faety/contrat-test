const { meSeen } = require('../../lib/handlers');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).send(JSON.stringify({ error: 'method' }));
  try {
    const r = await meSeen(req.headers.authorization || '');
    res.status(r.status).send(JSON.stringify(r.body));
  } catch (e) {
    res.status(500).send(JSON.stringify({ error: 'serveur', message: e.message }));
  }
};
