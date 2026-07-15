/*
  Emails transactionnels (reçu de paiement, bienvenue, notification de vente).
  Deux fournisseurs possibles, choisis par les variables d'environnement :

  1) Resend (recommandé, resend.com) — API HTTPS, idéale en serverless :
       RESEND_API_KEY  clé API (re_…)
       MAIL_FROM       expéditeur vérifié, ex. contact@boyiainstitute.com
                       (défaut : onboarding@resend.dev — tests uniquement,
                        ne délivre qu'à l'adresse du compte Resend)
  2) SMTP via nodemailer (Hostinger, Gmail, Brevo…) :
       SMTP_HOST, SMTP_PORT (465 défaut), SMTP_USER, SMTP_PASS
       MAIL_FROM (défaut : SMTP_USER)

  Communs :
       MAIL_FROM_NAME  nom affiché (défaut : Boyia Institute)
       NOTIFY_EMAIL    reçoit une notification à chaque vente (optionnel)

  Sans configuration : tout est no-op silencieux (aucune erreur, rien d'envoyé).
*/
'use strict';

const RESEND_KEY = process.env.RESEND_API_KEY || '';
const HOST = process.env.SMTP_HOST || '';
const PORT = parseInt(process.env.SMTP_PORT || '465', 10);
const USER = process.env.SMTP_USER || '';
const PASS = process.env.SMTP_PASS || '';
const FROM = process.env.MAIL_FROM || USER || (RESEND_KEY ? 'onboarding@resend.dev' : '');
const FROM_NAME = process.env.MAIL_FROM_NAME || 'Boyia Institute';
const NOTIFY = process.env.NOTIFY_EMAIL || '';
const APP_URL = (process.env.APP_URL || 'https://boyiainstitute.com').replace(/\/$/, '');

let _transport = null;
function isConfigured() { return !!(RESEND_KEY || (HOST && USER && PASS) || _transport); }
function getTransport() {
  if (_transport) return _transport;
  const nodemailer = require('nodemailer');
  _transport = nodemailer.createTransport({
    host: HOST, port: PORT, secure: PORT === 465,
    auth: { user: USER, pass: PASS },
  });
  return _transport;
}
/* Injection d'un faux transport pour les tests. */
function _setTransport(t) { _transport = t; }

/* Envoi via l'API Resend (https://resend.com/docs/api-reference/emails/send-email). */
async function sendViaResend({ to, subject, html, text }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `${FROM_NAME} <${FROM}>`, to: [to], subject, html, text }),
  });
  if (!res.ok) {
    let msg = `resend ${res.status}`;
    try { const j = await res.json(); if (j && j.message) msg += `: ${j.message}`; } catch (e) {}
    throw new Error(msg);
  }
  return res.json();
}

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fcfa = n => n === 0 ? 'Gratuit' : Number(n).toLocaleString('fr-FR') + ' FCFA';

/* Gabarit commun : bandeau bleu Boyia, contenu, pied de page. */
function layout(title, bodyHtml) {
  return `<!doctype html><html lang="fr"><body style="margin:0;padding:0;background:#EEF2FA;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:24px 12px">
    <div style="background:#3D63AE;border-radius:14px 14px 0 0;padding:22px 24px;text-align:center">
      <div style="color:#fff;font-size:21px;font-weight:bold;letter-spacing:.3px">Boyia <span style="color:#F2C464">Institute</span></div>
      <div style="color:#C9D7F2;font-size:12.5px;margin-top:4px">L'IA et l'anglais, simplement. À ton rythme.</div>
    </div>
    <div style="background:#ffffff;border-radius:0 0 14px 14px;padding:26px 24px;color:#1E2B45;font-size:15px;line-height:1.55">
      <h1 style="font-size:18px;margin:0 0 14px;color:#22397A">${esc(title)}</h1>
      ${bodyHtml}
    </div>
    <p style="text-align:center;color:#8A94AC;font-size:12px;margin-top:16px">
      Boyia Institute — <a href="${APP_URL}" style="color:#3D63AE">${APP_URL.replace(/^https?:\/\//, '')}</a><br>
      Nous ne demandons jamais ton code secret mobile money.
    </p>
  </div></body></html>`;
}
const btn = (href, label) =>
  `<p style="text-align:center;margin:22px 0"><a href="${href}" style="background:#3D63AE;color:#fff;text-decoration:none;font-weight:bold;padding:13px 26px;border-radius:12px;display:inline-block">${esc(label)}</a></p>`;

async function send({ to, subject, html, text }) {
  if (!isConfigured()) return { sent: false, reason: 'non-configure' };
  try {
    if (_transport || !RESEND_KEY) {
      await getTransport().sendMail({ from: `"${FROM_NAME}" <${FROM}>`, to, subject, html, text });
    } else {
      await sendViaResend({ to, subject, html, text });
    }
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: e.message };
  }
}

/* ---- Reçu / confirmation d'inscription (commande payée) ---- */
async function sendReceipt(order, courseName) {
  const b = order.buyer || {};
  if (!b.email) return { sent: false, reason: 'pas-d-email' };
  const free = !order.amount;
  const subject = free
    ? `Inscription confirmée — ${courseName}`
    : `Reçu de paiement — ${courseName} (${order.ref})`;
  const rows = [
    ['Cours', courseName],
    ['Montant', fcfa(order.amount || 0)],
    ['Référence', order.ref],
    order.transactionId ? ['Transaction Wave', order.transactionId] : null,
    ['Date', new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })],
  ].filter(Boolean);
  const html = layout(free ? 'Ton inscription est confirmée 🎉' : 'Ton paiement est confirmé 🎉', `
    <p>Bonjour ${esc(b.prenom || '')},</p>
    <p>${free ? 'Ton inscription au cours est confirmée.' : 'Nous avons bien reçu ton paiement Wave.'} Ton cours est débloqué — bonne formation !</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
      ${rows.map(([k, v]) => `<tr>
        <td style="padding:8px 10px;color:#66708C;border-bottom:1px solid #E7ECF6">${esc(k)}</td>
        <td style="padding:8px 10px;font-weight:bold;border-bottom:1px solid #E7ECF6;text-align:right">${esc(v)}</td>
      </tr>`).join('')}
    </table>
    ${btn(APP_URL, 'Ouvrir mon cours')}
    <p style="font-size:13px;color:#66708C">Astuce : ouvre le site sur le même téléphone (et le même navigateur) que celui utilisé pour t'inscrire — tu retrouveras ton cours dans l'onglet « Mes cours ». Garde cette référence : <b>${esc(order.ref)}</b>.</p>
  `);
  const text = `Bonjour ${b.prenom || ''},\n\n${free ? 'Ton inscription est confirmée.' : 'Paiement confirmé.'}\nCours : ${courseName}\nMontant : ${fcfa(order.amount || 0)}\nRéférence : ${order.ref}\n\nOuvre ${APP_URL} (même téléphone/navigateur) → onglet « Mes cours ».\n\nBoyia Institute`;
  return send({ to: b.email, subject, html, text });
}

/* ---- Bienvenue (création de compte) ---- */
async function sendWelcome({ prenom, email }) {
  if (!email) return { sent: false, reason: 'pas-d-email' };
  const html = layout('Bienvenue à Boyia Institute 🎓', `
    <p>Bonjour ${esc(prenom || '')},</p>
    <p>Ton compte est créé — bienvenue ! Voici comment bien démarrer :</p>
    <p style="margin:14px 0 4px"><b>1. Commence gratuitement.</b> Le cours « Comprendre l'IA en 30 minutes » et le cours d'anglais sont offerts.</p>
    <p style="margin:4px 0"><b>2. Passe au niveau supérieur.</b> ChatGPT, Claude ou Copilot au travail : des méthodes concrètes, des consignes à copier-coller, un plan de 7 jours.</p>
    <p style="margin:4px 0"><b>3. Rejoins la communauté.</b> Pose tes questions dans « Entraide » et partage tes victoires — on lit tout.</p>
    ${btn(APP_URL, 'Commencer maintenant')}
    <p style="font-size:13px;color:#66708C">15 minutes par jour suffisent. La régularité bat la motivation.</p>
  `);
  const text = `Bonjour ${prenom || ''},\n\nTon compte Boyia Institute est créé !\n\n1. Commence par les cours gratuits (IA, anglais).\n2. Passe aux cours ChatGPT / Claude / Copilot au travail.\n3. Rejoins la communauté (Entraide, Victoires).\n\n${APP_URL}\n\nBoyia Institute`;
  return send({ to: email, subject: 'Bienvenue à Boyia Institute 🎓', html, text });
}

/* ---- Code de connexion (compte serveur) ---- */
async function sendLoginCode(email, code) {
  if (!email) return { sent: false, reason: 'pas-d-email' };
  const html = layout('Ton code de connexion', `
    <p>Voici ton code pour te connecter à Boyia Institute :</p>
    <p style="text-align:center;margin:20px 0"><span style="display:inline-block;background:#EEF2FA;color:#22397A;font-size:30px;font-weight:bold;letter-spacing:8px;padding:14px 22px;border-radius:12px">${esc(code)}</span></p>
    <p style="font-size:13.5px;color:#66708C">Ce code expire dans 10 minutes. Si tu n'as pas demandé à te connecter, ignore cet e-mail — ton compte reste protégé.</p>
  `);
  const text = `Ton code de connexion Boyia Institute : ${code}\nIl expire dans 10 minutes.`;
  return send({ to: email, subject: `Ton code Boyia Institute : ${code}`, html, text });
}

/* ---- Notification interne à chaque vente (NOTIFY_EMAIL) ---- */
async function sendSaleNotification(order, courseName) {
  if (!NOTIFY) return { sent: false, reason: 'pas-de-notify' };
  const b = order.buyer || {};
  const html = layout('Nouvelle inscription payée 💰', `
    <p><b>${esc(courseName)}</b> — ${esc(fcfa(order.amount || 0))}${order.coupon ? ` (coupon ${esc(order.coupon)})` : ''}</p>
    <p>Réf : <b>${esc(order.ref)}</b>${order.transactionId ? ` · Transaction : ${esc(order.transactionId)}` : ''}</p>
    <p>Client : ${esc(b.prenom || '')} ${esc(b.nom || '')}<br>WhatsApp : ${esc(b.whatsapp || '—')}<br>E-mail : ${esc(b.email || '—')}</p>
  `);
  return send({
    to: NOTIFY,
    subject: `💰 Vente : ${courseName} — ${fcfa(order.amount || 0)} (${order.ref})`,
    html,
    text: `Vente : ${courseName} — ${fcfa(order.amount || 0)}\nRéf ${order.ref}\n${b.prenom || ''} ${b.nom || ''} · ${b.whatsapp || ''} · ${b.email || ''}`,
  });
}

module.exports = { isConfigured, send, sendReceipt, sendWelcome, sendSaleNotification, sendLoginCode, _setTransport };
