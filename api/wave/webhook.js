const { webhook, readRawBody } = require('../../lib/handlers');

/* IMPORTANT : désactive le parsing automatique pour lire le corps BRUT
   (la signature Wave est calculée sur les octets exacts du corps). */
module.exports.config = { api: { bodyParser: false } };

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).send(JSON.stringify({ error: 'method' }));
  try {
    const raw = await readRawBody(req);
    const sig = req.headers['wave-signature'];
    const r = await webhook(raw, sig);
    res.status(r.status).send(JSON.stringify(r.body));
  } catch (e) {
    res.status(500).send(JSON.stringify({ error: 'serveur', message: e.message }));
  }
};
