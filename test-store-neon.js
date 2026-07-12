/* Vérifie la branche Neon de lib/store.js sans vraie base : on simule le driver. */
const Module = require('module');
const path = require('path');

// Fausse base : un tableau de lignes + un moteur SQL tagué minimaliste.
const rows = [];
function fakeSql(strings, ...vals) {
  const q = strings.join('?').toLowerCase().trim();
  if (q.includes('create table')) return Promise.resolve([]);
  if (q.startsWith('insert into orders')) {
    rows.push({ ref: vals[0], course_id: vals[1], amount: vals[2], status: vals[3],
      wave_session_id: vals[4], transaction_id: null, buyer: JSON.parse(vals[5]),
      last_error: null, created_at: new Date().toISOString(), paid_at: null });
    return Promise.resolve([]);
  }
  if (q.startsWith('select * from orders where ref')) {
    return Promise.resolve(rows.filter(r => r.ref === vals[0]).slice(0, 1));
  }
  if (q.startsWith('select * from orders where wave_session_id')) {
    return Promise.resolve(rows.filter(r => r.wave_session_id === vals[0]).slice(0, 1));
  }
  if (q.startsWith('update orders')) {
    // vals ordre : status, waveSessionId, transactionId, lastError, status(pour paid_at), ref
    const ref = vals[vals.length - 1];
    const r = rows.find(x => x.ref === ref); if (!r) return Promise.resolve([]);
    if (vals[0] != null) r.status = vals[0];
    if (vals[1] != null) r.wave_session_id = vals[1];
    if (vals[2] != null) r.transaction_id = vals[2];
    if (vals[3] != null) r.last_error = vals[3];
    if (vals[0] === 'paid' && !r.paid_at) r.paid_at = new Date().toISOString();
    return Promise.resolve([{ ...r }]);
  }
  throw new Error('requête non gérée: ' + q);
}

// Injecte le faux module @neondatabase/serverless.
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === '@neondatabase/serverless') return { neon: () => fakeSql };
  return origLoad.apply(this, arguments);
};

process.env.DATABASE_URL = 'postgresql://fake';
delete require.cache[require.resolve('/home/user/contrat-test/lib/store.js')];
const store = require('/home/user/contrat-test/lib/store.js');

(async () => {
  let pass = 0, fail = 0;
  const check = (c, n) => { if (c) { pass++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n); } };

  check(store.kind === 'neon', 'store.kind = neon quand DATABASE_URL présent');
  await store.create({ ref: 'KL-TEST', courseId: 'chatgpt', amount: 5000, status: 'pending', waveSessionId: 'cos-1', buyer: { prenom: 'Awa', nom: 'K' } });
  let o = await store.get('KL-TEST');
  check(o && o.courseId === 'chatgpt' && o.amount === 5000 && o.status === 'pending', 'create + get (mapping colonnes → camelCase)');
  check(o.buyer && o.buyer.prenom === 'Awa', 'buyer JSONB relu correctement');
  const bySess = await store.findBySessionId('cos-1');
  check(bySess && bySess.ref === 'KL-TEST', 'findBySessionId');
  o = await store.update('KL-TEST', { status: 'paid', transactionId: 'TX-1' });
  check(o.status === 'paid' && o.transactionId === 'TX-1' && o.paidAt, 'update → paid + transaction + paidAt');
  o = await store.get('KL-TEST');
  check(o.status === 'paid', 'persistance de la mise à jour');

  console.log(`\n${pass}/${pass + fail} tests store Neon OK`);
  process.exit(fail ? 1 : 0);
})();
