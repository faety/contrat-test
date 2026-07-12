/*
  Stockage des commandes. Deux implémentations, choisies par la présence de DATABASE_URL :
   - Neon / PostgreSQL (production Vercel) via @neondatabase/serverless ;
   - mémoire (dev local, tests, mode démo sans base).
  API asynchrone unique : ensureSchema, create, get, update.
*/
'use strict';
const DATABASE_URL = process.env.DATABASE_URL || '';

/* ---- Implémentation mémoire ---- */
function memStore() {
  const map = new Map();
  return {
    kind: 'memory',
    async ensureSchema() {},
    async create(o) { map.set(o.ref, { ...o }); return { ...o }; },
    async get(ref) { const o = map.get(ref); return o ? { ...o } : null; },
    async update(ref, patch) {
      const o = map.get(ref); if (!o) return null;
      Object.assign(o, patch); return { ...o };
    },
    async findBySessionId(id) {
      for (const o of map.values()) if (o.waveSessionId === id) return { ...o };
      return null;
    },
  };
}

/* ---- Implémentation Neon / PostgreSQL ---- */
function neonStore() {
  const { neon } = require('@neondatabase/serverless');
  const sql = neon(DATABASE_URL);
  let schemaReady = null;
  const rowToOrder = r => r && {
    ref: r.ref, courseId: r.course_id, amount: r.amount, status: r.status,
    waveSessionId: r.wave_session_id, transactionId: r.transaction_id,
    buyer: r.buyer, lastError: r.last_error,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : null,
    paidAt: r.paid_at ? new Date(r.paid_at).getTime() : null,
  };
  return {
    kind: 'neon',
    async ensureSchema() {
      if (!schemaReady) schemaReady = sql`
        CREATE TABLE IF NOT EXISTS orders (
          ref TEXT PRIMARY KEY,
          course_id TEXT NOT NULL,
          amount INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          wave_session_id TEXT,
          transaction_id TEXT,
          buyer JSONB,
          last_error TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          paid_at TIMESTAMPTZ
        )`;
      await schemaReady;
    },
    async create(o) {
      await this.ensureSchema();
      await sql`INSERT INTO orders (ref, course_id, amount, status, wave_session_id, buyer)
                VALUES (${o.ref}, ${o.courseId}, ${o.amount}, ${o.status || 'pending'},
                        ${o.waveSessionId || null}, ${JSON.stringify(o.buyer || {})})`;
      return this.get(o.ref);
    },
    async get(ref) {
      await this.ensureSchema();
      const rows = await sql`SELECT * FROM orders WHERE ref = ${ref} LIMIT 1`;
      return rowToOrder(rows[0]);
    },
    async update(ref, p) {
      await this.ensureSchema();
      const rows = await sql`
        UPDATE orders SET
          status = COALESCE(${p.status ?? null}, status),
          wave_session_id = COALESCE(${p.waveSessionId ?? null}, wave_session_id),
          transaction_id = COALESCE(${p.transactionId ?? null}, transaction_id),
          last_error = COALESCE(${p.lastError ?? null}, last_error),
          paid_at = CASE WHEN ${p.status ?? null} = 'paid' AND paid_at IS NULL THEN now() ELSE paid_at END
        WHERE ref = ${ref} RETURNING *`;
      return rowToOrder(rows[0]);
    },
    async findBySessionId(id) {
      await this.ensureSchema();
      const rows = await sql`SELECT * FROM orders WHERE wave_session_id = ${id} LIMIT 1`;
      return rowToOrder(rows[0]);
    },
  };
}

const store = DATABASE_URL ? neonStore() : memStore();
module.exports = store;
