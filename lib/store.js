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
  /* Comptes (mémoire) */
  const users = new Map();            // id -> user
  const usersByEmail = new Map();     // email -> id
  const sessions = new Map();         // tokenHash -> { userId, expiresAt }
  const codes = new Map();            // email -> { hash, expiresAt, attempts }
  const enrollments = new Map();      // userId -> Map(courseId -> { paid, orderRef, at })
  const progress = new Map();         // userId -> Set('courseId:lessonKey')
  let uid = 0;
  const cloneUser = u => u ? { ...u } : null;
  return {
    kind: 'memory',
    async ensureSchema() {},
    /* ---- Comptes ---- */
    async userGetByEmail(email) { const id = usersByEmail.get(String(email).toLowerCase()); return id ? cloneUser(users.get(id)) : null; },
    async userGetById(id) { return cloneUser(users.get(id)); },
    async userCreate(u) {
      const email = String(u.email).toLowerCase();
      const id = 'u' + (++uid);
      const rec = { id, email, prenom: u.prenom || '', nom: u.nom || '', whatsapp: u.whatsapp || '', prefix: u.prefix || '+225', points: u.points || 0, createdAt: Date.now() };
      users.set(id, rec); usersByEmail.set(email, id);
      return cloneUser(rec);
    },
    async userUpdate(id, patch) {
      const u = users.get(id); if (!u) return null;
      for (const k of ['prenom', 'nom', 'whatsapp', 'prefix', 'points']) if (patch[k] != null) u[k] = patch[k];
      return cloneUser(u);
    },
    async codeSet(email, hash, expiresAt) { codes.set(String(email).toLowerCase(), { hash, expiresAt, attempts: 0 }); },
    async codeGet(email) { const c = codes.get(String(email).toLowerCase()); return c ? { ...c } : null; },
    async codeAttempt(email) { const c = codes.get(String(email).toLowerCase()); if (!c) return 0; c.attempts++; return c.attempts; },
    async codeClear(email) { codes.delete(String(email).toLowerCase()); },
    async sessionCreate(userId, tokenHash, expiresAt) { sessions.set(tokenHash, { userId, expiresAt }); },
    async sessionUser(tokenHash) {
      const s = sessions.get(tokenHash); if (!s) return null;
      if (s.expiresAt && s.expiresAt < Date.now()) { sessions.delete(tokenHash); return null; }
      return cloneUser(users.get(s.userId));
    },
    async sessionDelete(tokenHash) { sessions.delete(tokenHash); },
    async enrollmentUpsert(userId, courseId, o = {}) {
      if (!enrollments.has(userId)) enrollments.set(userId, new Map());
      const m = enrollments.get(userId); const prev = m.get(courseId) || { at: Date.now() };
      m.set(courseId, { paid: o.paid != null ? o.paid : (prev.paid || false), orderRef: o.orderRef || prev.orderRef || null, at: prev.at });
    },
    async enrollmentsByUser(userId) {
      const m = enrollments.get(userId); if (!m) return [];
      return [...m.entries()].map(([courseId, v]) => ({ courseId, paid: v.paid, orderRef: v.orderRef, at: v.at }));
    },
    async progressAdd(userId, courseId, lessonKey) {
      if (!progress.has(userId)) progress.set(userId, new Set());
      const set = progress.get(userId); const key = courseId + ':' + lessonKey;
      if (set.has(key)) return { added: false }; set.add(key); return { added: true };
    },
    async progressByUser(userId) {
      const set = progress.get(userId); if (!set) return [];
      return [...set].map(k => { const i = k.indexOf(':'); return { courseId: k.slice(0, i), lessonKey: k.slice(i + 1) }; });
    },
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
    buyer: r.buyer, coupon: r.coupon, lastError: r.last_error, emailed: !!r.emailed,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : null,
    paidAt: r.paid_at ? new Date(r.paid_at).getTime() : null,
  };
  const rowToCoupon = r => r && {
    code: r.code, type: r.type, value: r.value, active: r.active,
    label: r.label, uses: r.uses,
  };
  const rowToUser = r => r && {
    id: r.id, email: r.email, prenom: r.prenom || '', nom: r.nom || '',
    whatsapp: r.whatsapp || '', prefix: r.prefix || '+225', points: r.points || 0,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : null,
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
      await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS emailed BOOLEAN NOT NULL DEFAULT false`;
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
      /* ---- Comptes ---- */
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT UNIQUE NOT NULL,
          prenom TEXT, nom TEXT, whatsapp TEXT, prefix TEXT DEFAULT '+225',
          points INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )`;
      await sql`
        CREATE TABLE IF NOT EXISTS sessions (
          token_hash TEXT PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          expires_at TIMESTAMPTZ NOT NULL
        )`;
      await sql`
        CREATE TABLE IF NOT EXISTS login_codes (
          email TEXT PRIMARY KEY,
          code_hash TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0
        )`;
      await sql`
        CREATE TABLE IF NOT EXISTS enrollments (
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          course_id TEXT NOT NULL,
          paid BOOLEAN NOT NULL DEFAULT false,
          order_ref TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          PRIMARY KEY (user_id, course_id)
        )`;
      await sql`
        CREATE TABLE IF NOT EXISTS progress (
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          course_id TEXT NOT NULL,
          lesson_key TEXT NOT NULL,
          done_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          PRIMARY KEY (user_id, course_id, lesson_key)
        )`;
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
          emailed = COALESCE(${p.emailed ?? null}, emailed),
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
    /* ---- Comptes ---- */
    async userGetByEmail(email) {
      await ensureSchema();
      const r = await sql`SELECT * FROM users WHERE email = ${String(email).toLowerCase()} LIMIT 1`;
      return rowToUser(r[0]);
    },
    async userGetById(id) {
      await ensureSchema();
      const r = await sql`SELECT * FROM users WHERE id = ${id} LIMIT 1`;
      return rowToUser(r[0]);
    },
    async userCreate(u) {
      await ensureSchema();
      const r = await sql`
        INSERT INTO users (email, prenom, nom, whatsapp, prefix, points)
        VALUES (${String(u.email).toLowerCase()}, ${u.prenom || ''}, ${u.nom || ''}, ${u.whatsapp || ''}, ${u.prefix || '+225'}, ${u.points || 0})
        RETURNING *`;
      return rowToUser(r[0]);
    },
    async userUpdate(id, p) {
      await ensureSchema();
      const r = await sql`
        UPDATE users SET
          prenom = COALESCE(${p.prenom ?? null}, prenom),
          nom = COALESCE(${p.nom ?? null}, nom),
          whatsapp = COALESCE(${p.whatsapp ?? null}, whatsapp),
          prefix = COALESCE(${p.prefix ?? null}, prefix),
          points = COALESCE(${p.points ?? null}, points)
        WHERE id = ${id} RETURNING *`;
      return rowToUser(r[0]);
    },
    async codeSet(email, hash, expiresAt) {
      await ensureSchema();
      await sql`
        INSERT INTO login_codes (email, code_hash, expires_at, attempts)
        VALUES (${String(email).toLowerCase()}, ${hash}, ${new Date(expiresAt).toISOString()}, 0)
        ON CONFLICT (email) DO UPDATE SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at, attempts = 0`;
    },
    async codeGet(email) {
      await ensureSchema();
      const r = await sql`SELECT * FROM login_codes WHERE email = ${String(email).toLowerCase()} LIMIT 1`;
      const c = r[0]; return c ? { hash: c.code_hash, expiresAt: new Date(c.expires_at).getTime(), attempts: c.attempts } : null;
    },
    async codeAttempt(email) {
      await ensureSchema();
      const r = await sql`UPDATE login_codes SET attempts = attempts + 1 WHERE email = ${String(email).toLowerCase()} RETURNING attempts`;
      return r[0] ? r[0].attempts : 0;
    },
    async codeClear(email) {
      await ensureSchema();
      await sql`DELETE FROM login_codes WHERE email = ${String(email).toLowerCase()}`;
    },
    async sessionCreate(userId, tokenHash, expiresAt) {
      await ensureSchema();
      await sql`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (${tokenHash}, ${userId}, ${new Date(expiresAt).toISOString()})`;
    },
    async sessionUser(tokenHash) {
      await ensureSchema();
      const r = await sql`
        SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ${tokenHash} AND s.expires_at > now() LIMIT 1`;
      return rowToUser(r[0]);
    },
    async sessionDelete(tokenHash) {
      await ensureSchema();
      await sql`DELETE FROM sessions WHERE token_hash = ${tokenHash}`;
    },
    async enrollmentUpsert(userId, courseId, o = {}) {
      await ensureSchema();
      await sql`
        INSERT INTO enrollments (user_id, course_id, paid, order_ref)
        VALUES (${userId}, ${courseId}, ${o.paid || false}, ${o.orderRef || null})
        ON CONFLICT (user_id, course_id) DO UPDATE SET
          paid = enrollments.paid OR EXCLUDED.paid,
          order_ref = COALESCE(EXCLUDED.order_ref, enrollments.order_ref)`;
    },
    async enrollmentsByUser(userId) {
      await ensureSchema();
      const r = await sql`SELECT course_id, paid, order_ref, created_at FROM enrollments WHERE user_id = ${userId}`;
      return r.map(x => ({ courseId: x.course_id, paid: x.paid, orderRef: x.order_ref, at: new Date(x.created_at).getTime() }));
    },
    async progressAdd(userId, courseId, lessonKey) {
      await ensureSchema();
      const r = await sql`
        INSERT INTO progress (user_id, course_id, lesson_key) VALUES (${userId}, ${courseId}, ${lessonKey})
        ON CONFLICT (user_id, course_id, lesson_key) DO NOTHING RETURNING lesson_key`;
      return { added: r.length > 0 };
    },
    async progressByUser(userId) {
      await ensureSchema();
      const r = await sql`SELECT course_id, lesson_key FROM progress WHERE user_id = ${userId}`;
      return r.map(x => ({ courseId: x.course_id, lessonKey: x.lesson_key }));
    },
  };
}

const store = DATABASE_URL ? neonStore() : memStore();
module.exports = store;
