/*
  Stockage (commandes + coupons). Deux implémentations, choisies par DATABASE_URL :
   - Neon / PostgreSQL (production Vercel) via @neondatabase/serverless ;
   - mémoire (dev local, tests, mode démo sans base).
*/
'use strict';
const DATABASE_URL = process.env.DATABASE_URL || '';
const { SEED_COUPONS, normCode } = require('./coupons');

/* ---- Implémentation mémoire ---- */
function memStore() {
  const orders = new Map();
  const coupons = new Map();
  for (const c of SEED_COUPONS) coupons.set(c.code, { ...c, uses: 0 });
  return {
    kind: 'memory',
    async ensureSchema() {},
    async create(o) { orders.set(o.ref, { createdAt: Date.now(), ...o }); return { ...orders.get(o.ref) }; },
    async get(ref) { const o = orders.get(ref); return o ? { ...o } : null; },
    async orderList(limit = 20) {
      return [...orders.values()].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, limit).map(o => ({ ...o }));
    },
    async orderStats() {
      const all = [...orders.values()];
      const paid = all.filter(o => o.status === 'paid');
      const byCourse = {};
      for (const o of paid) { const k = o.courseId; (byCourse[k] = byCourse[k] || { courseId: k, count: 0, revenue: 0 }); byCourse[k].count++; byCourse[k].revenue += o.amount || 0; }
      return {
        total: all.length, paid: paid.length,
        pending: all.filter(o => o.status === 'pending').length,
        failed: all.filter(o => o.status === 'failed').length,
        revenue: paid.reduce((s, o) => s + (o.amount || 0), 0),
        byCourse: Object.values(byCourse),
      };
    },
    async update(ref, patch) {
      const o = orders.get(ref); if (!o) return null;
      Object.assign(o, patch); if (patch.status === 'paid' && !o.paidAt) o.paidAt = Date.now();
      return { ...o };
    },
    async findBySessionId(id) {
      for (const o of orders.values()) if (o.waveSessionId === id) return { ...o };
      return null;
    },
    async couponGet(code) { const c = coupons.get(normCode(code)); return c ? { ...c } : null; },
    async couponList() { return [...coupons.values()].map(c => ({ ...c })); },
    async couponSave(c) { const prev = coupons.get(c.code); coupons.set(c.code, { ...c, uses: prev ? prev.uses : 0 }); return { ...coupons.get(c.code) }; },
    async couponDelete(code) { coupons.delete(normCode(code)); },
    async couponBump(code) { const c = coupons.get(normCode(code)); if (c) c.uses = (c.uses || 0) + 1; },
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
    buyer: r.buyer, coupon: r.coupon, lastError: r.last_error,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : null,
    paidAt: r.paid_at ? new Date(r.paid_at).getTime() : null,
  };
  const rowToCoupon = r => r && {
    code: r.code, type: r.type, value: r.value, active: r.active,
    label: r.label, uses: r.uses,
  };
  async function ensureSchema() {
    if (!schemaReady) schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS orders (
          ref TEXT PRIMARY KEY,
          course_id TEXT NOT NULL,
          amount INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          wave_session_id TEXT,
          transaction_id TEXT,
          buyer JSONB,
          coupon TEXT,
          last_error TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          paid_at TIMESTAMPTZ
        )`;
      await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon TEXT`;
      await sql`
        CREATE TABLE IF NOT EXISTS coupons (
          code TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          value INTEGER NOT NULL,
          active BOOLEAN NOT NULL DEFAULT true,
          label TEXT,
          uses INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )`;
      for (const c of SEED_COUPONS) {
        await sql`INSERT INTO coupons (code, type, value, active, label)
                  VALUES (${c.code}, ${c.type}, ${c.value}, ${c.active}, ${c.label})
                  ON CONFLICT (code) DO NOTHING`;
      }
    })();
    await schemaReady;
  }
  return {
    kind: 'neon',
    ensureSchema,
    async create(o) {
      await ensureSchema();
      await sql`INSERT INTO orders (ref, course_id, amount, status, wave_session_id, buyer, coupon)
                VALUES (${o.ref}, ${o.courseId}, ${o.amount}, ${o.status || 'pending'},
                        ${o.waveSessionId || null}, ${JSON.stringify(o.buyer || {})}, ${o.coupon || null})`;
      return this.get(o.ref);
    },
    async get(ref) {
      await ensureSchema();
      const rows = await sql`SELECT * FROM orders WHERE ref = ${ref} LIMIT 1`;
      return rowToOrder(rows[0]);
    },
    async update(ref, p) {
      await ensureSchema();
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
      await ensureSchema();
      const rows = await sql`SELECT * FROM orders WHERE wave_session_id = ${id} LIMIT 1`;
      return rowToOrder(rows[0]);
    },
    async orderList(limit = 20) {
      await ensureSchema();
      const rows = await sql`SELECT * FROM orders ORDER BY created_at DESC LIMIT ${limit}`;
      return rows.map(rowToOrder);
    },
    async orderStats() {
      await ensureSchema();
      const st = await sql`SELECT status, count(*)::int AS c, COALESCE(SUM(amount),0)::int AS rev FROM orders GROUP BY status`;
      const bc = await sql`SELECT course_id, count(*)::int AS c, COALESCE(SUM(amount),0)::int AS rev FROM orders WHERE status='paid' GROUP BY course_id`;
      let total = 0, paid = 0, pending = 0, failed = 0, revenue = 0;
      for (const r of st) { total += r.c; if (r.status === 'paid') { paid = r.c; revenue = r.rev; } else if (r.status === 'pending') pending = r.c; else if (r.status === 'failed') failed = r.c; }
      return { total, paid, pending, failed, revenue, byCourse: bc.map(r => ({ courseId: r.course_id, count: r.c, revenue: r.rev })) };
    },
    async couponGet(code) {
      await ensureSchema();
      const rows = await sql`SELECT * FROM coupons WHERE code = ${normCode(code)} LIMIT 1`;
      return rowToCoupon(rows[0]);
    },
    async couponList() {
      await ensureSchema();
      const rows = await sql`SELECT * FROM coupons ORDER BY created_at DESC`;
      return rows.map(rowToCoupon);
    },
    async couponSave(c) {
      await ensureSchema();
      const rows = await sql`
        INSERT INTO coupons (code, type, value, active, label)
        VALUES (${c.code}, ${c.type}, ${c.value}, ${c.active}, ${c.label || ''})
        ON CONFLICT (code) DO UPDATE SET
          type = EXCLUDED.type, value = EXCLUDED.value,
          active = EXCLUDED.active, label = EXCLUDED.label
        RETURNING *`;
      return rowToCoupon(rows[0]);
    },
    async couponDelete(code) {
      await ensureSchema();
      await sql`DELETE FROM coupons WHERE code = ${normCode(code)}`;
    },
    async couponBump(code) {
      await ensureSchema();
      await sql`UPDATE coupons SET uses = uses + 1 WHERE code = ${normCode(code)}`;
    },
  };
}

const store = DATABASE_URL ? neonStore() : memStore();
module.exports = store;
