// Fonction serverless Vercel : toutes les routes sont réécrites vers /api
// (voir vercel.json) et servies par l'application NestJS compilée.
let handlerPromise;

module.exports = async (req, res) => {
  handlerPromise ||= require("../dist/vercel-bootstrap.js").createHandler();
  const handler = await handlerPromise;
  return handler(req, res);
};
