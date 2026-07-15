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

module.exports = {
  CODE_TTL_MS, CODE_MAX_ATTEMPTS, SESSION_TTL_MS,
  newToken, hashToken, newCode, hashCode, normEmail, validEmail, safeEqual,
};
