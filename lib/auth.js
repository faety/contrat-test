/*
  Petits utilitaires d'authentification (comptes serveur).
  - Jeton de session : 32 octets aléatoires (hex). On ne stocke QUE son hash en base.
  - Code de connexion : 6 chiffres, envoyé par e-mail, stocké haché et lié à l'e-mail.
*/
'use strict';
const crypto = require('crypto');

const CODE_TTL_MS = 10 * 60 * 1000;      // 10 minutes
const CODE_MAX_ATTEMPTS = 5;
const SESSION_TTL_MS = 365 * 24 * 3600 * 1000; // 1 an

const sha256 = s => crypto.createHash('sha256').update(String(s)).digest('hex');

function newToken() { return crypto.randomBytes(32).toString('hex'); }
function hashToken(t) { return sha256(t); }

function newCode() { return String(crypto.randomInt(0, 1000000)).padStart(6, '0'); }
/* Le hash lie le code à l'e-mail : un code volé ne vaut rien pour une autre adresse. */
function hashCode(email, code) { return sha256(normEmail(email) + ':' + String(code).trim()); }

function normEmail(e) { return String(e || '').trim().toLowerCase(); }
function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normEmail(e)); }

/* Comparaison à temps constant de deux chaînes hex de même longueur. */
function safeEqual(a, b) {
  const ba = Buffer.from(String(a)); const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

/* ---- Mots de passe (scrypt + sel aléatoire, jamais stockés en clair) ---- */
const PASSWORD_MIN = 6;
function validPassword(pw) { return typeof pw === 'string' && pw.length >= PASSWORD_MIN && pw.length <= 200; }
function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const dk = crypto.scryptSync(String(pw), salt, 32);
  return 'scrypt$' + salt.toString('hex') + '$' + dk.toString('hex');
}
function verifyPassword(pw, stored) {
  if (!stored || typeof stored !== 'string' || !stored.startsWith('scrypt$')) return false;
  const parts = stored.split('$');
  if (parts.length !== 3) return false;
  const salt = Buffer.from(parts[1], 'hex');
  const expected = Buffer.from(parts[2], 'hex');
  let dk; try { dk = crypto.scryptSync(String(pw), salt, expected.length); } catch (e) { return false; }
  return dk.length === expected.length && crypto.timingSafeEqual(dk, expected);
}

module.exports = {
  CODE_TTL_MS, CODE_MAX_ATTEMPTS, SESSION_TTL_MS, PASSWORD_MIN,
  newToken, hashToken, newCode, hashCode, normEmail, validEmail, safeEqual,
  validPassword, hashPassword, verifyPassword,
};
