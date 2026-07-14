/*
  Logique des coupons — pure (aucune I/O). Partagée serveur/tests.
  Types de coupon :
   - 'percent' : réduction en pourcentage (value = 0..100)
   - 'amount'  : réduction d'un montant fixe en FCFA (value = FCFA retirés)
   - 'fixed'   : prix fixe imposé en FCFA (value = prix final)
  Le calcul du montant à payer se fait TOUJOURS côté serveur (jamais le client).
*/
'use strict';

const WAVE_MIN = 100; // montant minimum facturable par Wave (XOF)

/* Coupon pré-créé pour les tests : fixe le prix à 200 F. */
const SEED_COUPONS = [
  { code: 'CADEAU200', type: 'fixed', value: 200, active: true, label: 'Test — prix fixe 200 F' },
];

const normCode = c => String(c || '').trim().toUpperCase();

/* Calcule le montant à payer après application éventuelle d'un coupon.
   Retourne { amount, applied, free }.
   - free = true si le coupon ramène le prix à 0 (inscription offerte, sans Wave).
   - sinon amount est borné au minimum facturable Wave. */
function computeAmount(basePrice, coupon) {
  if (!coupon || !coupon.active) return { amount: basePrice, applied: false, free: false };
  let a = basePrice;
  if (coupon.type === 'percent') a = basePrice * (1 - Number(coupon.value) / 100);
  else if (coupon.type === 'amount') a = basePrice - Number(coupon.value);
  else if (coupon.type === 'fixed') a = Number(coupon.value);
  a = Math.round(a);
  if (!Number.isFinite(a) || a <= 0) return { amount: 0, applied: true, free: true };
  return { amount: Math.max(WAVE_MIN, a), applied: true, free: false };
}

/* Valide/normalise un coupon soumis par l'admin. Retourne { ok, coupon } ou { ok:false, error }. */
function validateCoupon(input) {
  const code = normCode(input && input.code);
  if (!/^[A-Z0-9._-]{3,32}$/.test(code)) return { ok: false, error: 'Code invalide (3–32 caractères : lettres, chiffres, . _ -).' };
  const type = input.type;
  if (!['percent', 'amount', 'fixed'].includes(type)) return { ok: false, error: 'Type invalide.' };
  const value = Math.round(Number(input.value));
  if (!Number.isFinite(value) || value < 0) return { ok: false, error: 'Valeur invalide.' };
  if (type === 'percent' && (value < 1 || value > 100)) return { ok: false, error: 'Le pourcentage doit être entre 1 et 100.' };
  if ((type === 'amount' || type === 'fixed') && value < 0) return { ok: false, error: 'Le montant doit être positif.' };
  return {
    ok: true,
    coupon: {
      code, type, value,
      active: input.active !== false,
      label: String(input.label || '').slice(0, 80),
    },
  };
}

/* Résumé lisible d'un coupon (pour l'UI). */
function couponSummary(coupon) {
  if (!coupon) return '';
  if (coupon.type === 'percent') return `-${coupon.value} %`;
  if (coupon.type === 'amount') return `-${coupon.value.toLocaleString('fr-FR')} FCFA`;
  return `Prix fixe ${coupon.value.toLocaleString('fr-FR')} FCFA`;
}

module.exports = { WAVE_MIN, SEED_COUPONS, normCode, computeAmount, validateCoupon, couponSummary };
