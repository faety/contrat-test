const { health } = require('../lib/handlers');

module.exports = async (req, res) => {
  const r = await health();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(r.status).send(JSON.stringify(r.body));
};
