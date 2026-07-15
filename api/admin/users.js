const { adminUsers } = require('../../lib/handlers');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  try {
    const url = new URL(req.url, 'http://x');
    const r = await adminUsers(req.headers['x-admin-key'] || '', { q: url.searchParams.get('q') });
    res.status(r.status).send(JSON.stringify(r.body));
  } catch (e) {
    res.status(500).send(JSON.stringify({ error: 'serveur', message: e.message }));
  }
};
