"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Locale = "fr" | "en";

const dictionaries = {
  fr: {
    // Marque
    "brand.name": "Boyia",
    "brand.tagline": "Apprends, entreprends et sois récompensé.",
    "brand.currency": "Boyia Currency",

    // Landing
    "landing.hero.title": "Chaque action positive a de la valeur",
    "landing.hero.subtitle":
      "Boyia App récompense l'apprentissage, l'entrepreneuriat et les comportements positifs avec la Boyia Currency, une unité numérique interne simple, sécurisée et transparente.",
    "landing.hero.cta": "Créer mon compte",
    "landing.hero.login": "Se connecter",
    "landing.disclaimer":
      "La Boyia Currency est une unité numérique interne en circuit fermé, comparable à des points de fidélité évolués. Elle n'est ni une banque, ni une cryptomonnaie, ni une monnaie ayant cours légal.",
    "landing.feature.learn.title": "Apprends",
    "landing.feature.learn.desc":
      "Termine des formations, réussis des quiz et gagne des Boyia à chaque activité validée.",
    "landing.feature.earn.title": "Sois récompensé",
    "landing.feature.earn.desc":
      "Défis, missions, parrainage : chaque effort compte et chaque récompense est traçable.",
    "landing.feature.spend.title": "Utilise tes Boyia",
    "landing.feature.spend.desc":
      "Paye chez les partenaires par QR code, débloque des formations et profite d'offres exclusives.",
    "landing.feature.trust.title": "En toute confiance",
    "landing.feature.trust.desc":
      "Historique clair, reçus vérifiables, supervision parentale et registre comptable équilibré.",
    "landing.how.title": "Comment ça marche ?",
    "landing.how.step1.title": "Inscris-toi avec ton numéro",
    "landing.how.step1.desc":
      "Un téléphone suffit. Vérification par code SMS, portefeuille créé automatiquement.",
    "landing.how.step2.title": "Gagne des Boyia",
    "landing.how.step2.desc":
      "Formations, défis, ventes, invitations : les récompenses arrivent dans ton portefeuille.",
    "landing.how.step3.title": "Utilise-les dans l'écosystème",
    "landing.how.step3.desc":
      "Scanne le QR d'un commerçant partenaire ou débloque des avantages dans l'application.",
    "landing.offers.title": "Offres publiques du moment",
    "landing.partners.title": "Pour les commerçants et les écoles",
    "landing.partners.desc":
      "Fidélisez vos clients, récompensez vos élèves, mesurez vos campagnes. Boyia offre un portail dédié aux partenaires.",
    "landing.partners.cta": "Devenir partenaire",
    "landing.footer.legal":
      "© 2026 Boyia — Côte d'Ivoire. La Boyia Currency est utilisable uniquement dans l'écosystème Boyia et chez les partenaires autorisés.",
    "landing.demo.badge": "Version de démonstration — données fictives",

    // Auth
    "auth.login.title": "Bon retour !",
    "auth.login.subtitle": "Connecte-toi pour retrouver ton portefeuille.",
    "auth.phone": "Numéro de téléphone",
    "auth.pin": "Code secret",
    "auth.login.submit": "Se connecter",
    "auth.login.noAccount": "Pas encore de compte ?",
    "auth.login.signup": "S'inscrire",
    "auth.register.title": "Bienvenue sur Boyia",
    "auth.register.subtitle":
      "Crée ton compte en quelques secondes. Un code de vérification te sera envoyé par SMS.",
    "auth.firstName": "Prénom",
    "auth.lastName": "Nom",
    "auth.country": "Pays",
    "auth.birthDate": "Date de naissance",
    "auth.referral": "Code de parrainage (facultatif)",
    "auth.terms": "J'accepte les conditions d'utilisation et la politique de confidentialité.",
    "auth.register.submit": "Recevoir mon code SMS",
    "auth.otp.title": "Vérification",
    "auth.otp.subtitle": "Saisis le code à 6 chiffres envoyé au",
    "auth.otp.hint": "Démo : utilise le code 123456",
    "auth.otp.submit": "Vérifier",
    "auth.otp.error": "Code incorrect. En mode démo, utilise 123456.",
    "auth.pinCreate": "Code PIN transactionnel (4 à 6 chiffres)",
    "auth.demo.credentials": "Démo : +2250700000042 / PIN 1234 (Awa Kouassi)",
    "auth.register.hasAccount": "Déjà un compte ?",
    "auth.demo.note": "Mode démonstration : aucune donnée réelle n'est envoyée.",

    // Navigation
    "nav.home": "Accueil",
    "nav.discover": "Découvrir",
    "nav.scan": "Scanner",
    "nav.activities": "Activités",
    "nav.profile": "Profil",

    // Accueil
    "home.greeting": "Bonjour",
    "home.balance.total": "Solde total",
    "home.balance.available": "Disponible",
    "home.balance.hide": "Masquer le solde",
    "home.balance.show": "Afficher le solde",
    "home.balance.indicative": "valeur indicative",
    "home.pending.title": "Récompenses en attente",
    "home.pending.desc": "en cours de validation",
    "home.actions.send": "Envoyer",
    "home.actions.receive": "Recevoir",
    "home.actions.scan": "Scanner",
    "home.actions.earn": "Gagner",
    "home.transactions.title": "Dernières transactions",
    "home.transactions.all": "Tout voir",
    "home.challenges.title": "Défis en cours",
    "home.offers.title": "Offres recommandées",
    "home.level": "Niveau",
    "home.streak": "jours de série",
    "home.scan.cta": "Scanner",
    "home.menu.transfer": "Transfert",
    "home.menu.opportunities": "Opportunités",
    "home.menu.shop": "Boutique",
    "home.menu.card": "Carte",
    "home.menu.gifts": "Cadeaux",
    "home.menu.events": "Événements",
    "home.menu.spending": "Dépenses",

    // Portefeuille
    "wallet.title": "Portefeuille",
    "wallet.available": "Solde disponible",
    "wallet.pending": "En attente",
    "wallet.promo": "Promotionnel",
    "wallet.blocked": "Bloqué",
    "wallet.history": "Historique",
    "wallet.limits": "Limites du compte",
    "wallet.limits.perTx": "Par transfert",
    "wallet.limits.daily": "Par jour",
    "wallet.filter.all": "Tout",
    "wallet.filter.received": "Reçus",
    "wallet.filter.sent": "Envoyés",
    "wallet.filter.rewards": "Récompenses",
    "wallet.filter.payments": "Achats",
    "wallet.empty": "Aucune transaction pour ce filtre.",
    "wallet.balanceAfter": "Solde après",
    "wallet.reference": "Référence",
    "wallet.fee": "Frais",
    "wallet.receipt": "Reçu numérique",
    "wallet.receipt.verify": "QR code de vérification",
    "wallet.receipt.share": "Partager",
    "wallet.receipt.download": "Télécharger",
    "wallet.status.completed": "Confirmé",
    "wallet.status.pending": "En attente",
    "wallet.status.failed": "Échoué",
    "wallet.status.reversed": "Contrepassée",
    "wallet.type.reward": "Récompense",
    "wallet.type.transfer_in": "Transfert reçu",
    "wallet.type.transfer_out": "Transfert envoyé",
    "wallet.type.payment": "Paiement",
    "wallet.type.refund": "Remboursement",

    // Transfert
    "send.title": "Envoyer des Boyia",
    "send.recipient": "Destinataire",
    "send.recipient.placeholder": "Numéro, nom d'utilisateur…",
    "send.recent": "Bénéficiaires récents",
    "send.lookup": "Vérifier le destinataire",
    "send.suggestions": "Suggestions (comptes de démo)",
    "send.amount": "Montant",
    "send.note": "Note (facultatif)",
    "send.note.placeholder": "Merci pour ton aide !",
    "send.summary": "Résumé du transfert",
    "send.summary.to": "Vers",
    "send.summary.amount": "Montant",
    "send.summary.fee": "Frais",
    "send.summary.total": "Total débité",
    "send.summary.warning":
      "Vérifie bien le destinataire : un transfert confirmé est définitif.",
    "send.newRecipient": "Nouveau destinataire — première fois que tu envoies à ce contact.",
    "send.pin.title": "Confirme avec ton code PIN",
    "send.pin.hint": "Le code PIN que tu as choisi à l'inscription (démo Awa : 1234)",
    "send.pin.error": "Code PIN incorrect. En mode démo, utilise 1234.",
    "send.continue": "Continuer",
    "send.confirm": "Confirmer le transfert",
    "send.success.title": "Transfert effectué !",
    "send.success.desc": "a bien reçu tes Boyia. Un reçu a été généré.",
    "send.error.insufficient": "Solde disponible insuffisant.",
    "send.error.limit": "Ce montant dépasse la limite autorisée par transfert",
    "send.error.recipient": "Choisis un destinataire.",
    "send.error.amount": "Saisis un montant valide.",
    "send.viewReceipt": "Voir le reçu",
    "send.backHome": "Retour à l'accueil",

    // Recevoir
    "receive.title": "Recevoir des Boyia",
    "receive.desc":
      "Montre ce QR code ou partage ton identifiant pour recevoir un transfert.",
    "receive.username": "Nom d'utilisateur",
    "receive.copy": "Copier",
    "receive.copied": "Copié !",

    // Scanner
    "scan.title": "Scanner",
    "scan.desc": "Scanne le QR code d'un commerçant partenaire pour payer en Boyia.",
    "scan.demo": "Démo : simuler un paiement chez Boyia Market",
    "scan.simulate": "Simuler un scan",
    "scan.pay.title": "Paiement",
    "scan.pay.merchant": "Commerçant",
    "scan.pay.verified": "Partenaire vérifié",
    "scan.pay.amount": "Montant à payer",
    "scan.pay.mixed": "Paiement mixte : 30 % maximum en Boyia, le reste en FCFA.",
    "scan.pay.inBoyia": "Payé en Boyia",
    "scan.pay.inFcfa": "Reste à payer en FCFA",
    "scan.pay.confirm": "Payer",
    "scan.success": "Paiement confirmé ! Le commerçant a reçu une notification en temps réel.",
    "scan.camera.note":
      "L'accès caméra n'est pas activé dans cette démo web. Utilise la simulation ci-dessous.",

    // Découvrir
    "discover.title": "Découvrir",
    "discover.subtitle": "Offres, partenaires et bons plans près de chez toi.",
    "discover.categories.all": "Tout",
    "discover.categories.food": "Restauration",
    "discover.categories.education": "Formations",
    "discover.categories.shopping": "Boutiques",
    "discover.categories.events": "Événements",
    "discover.cashback": "cashback",
    "discover.discount": "de réduction",
    "discover.validUntil": "Valable jusqu'au",
    "discover.partner.verified": "Partenaire vérifié",

    // Activités
    "activities.title": "Activités",
    "activities.challenges": "Défis",
    "activities.courses": "Formations",
    "activities.reward": "Récompense",
    "activities.bonus": "Bonus",
    "activities.progress": "Progression",
    "activities.join": "Participer",
    "activities.joined": "Inscrit",
    "activities.continue": "Continuer",
    "activities.start": "Commencer",
    "activities.completed": "Terminé",
    "activities.lessons": "leçons",
    "activities.duration": "Durée",
    "activities.level.beginner": "Débutant",
    "activities.level.intermediate": "Intermédiaire",
    "activities.certificate": "Certificat inclus",
    "activities.xp": "XP",

    // Profil
    "profile.title": "Profil",
    "profile.verification": "Niveau de vérification",
    "profile.verification.levelLabel": "Niveau",
    "profile.verification.level1": "Téléphone vérifié",
    "profile.verification.upgrade": "Augmenter mes limites",
    "profile.badges": "Mes badges",
    "profile.referral.title": "Parrainage",
    "profile.referral.desc": "Invite tes amis et gagne 25 Boyia par filleul validé.",
    "profile.referral.code": "Ton code",
    "profile.settings": "Paramètres",
    "profile.settings.language": "Langue",
    "profile.settings.theme": "Apparence",
    "profile.settings.theme.light": "Clair",
    "profile.settings.theme.dark": "Sombre",
    "profile.settings.theme.system": "Système",
    "profile.settings.notifications": "Notifications",
    "profile.settings.security": "Sécurité",
    "profile.settings.security.desc": "PIN, biométrie, appareils connectés",
    "profile.parental": "Supervision parentale",
    "profile.parental.desc": "Comptes liés, limites et autorisations",
    "profile.support": "Aide et support",
    "profile.logout": "Se déconnecter",
    "profile.memberSince": "Membre depuis",

    // Divers
    "common.boyia": "Boyia",
    "common.fcfa": "FCFA",
    "common.cancel": "Annuler",
    "common.back": "Retour",
    "common.close": "Fermer",
    "common.demo":
      "Application de démonstration — toutes les données sont fictives.",
    "common.offline":
      "En attente de connexion — transaction non effectuée.",
  },
  en: {
    // Brand
    "brand.name": "Boyia",
    "brand.tagline": "Learn, build and get rewarded.",
    "brand.currency": "Boyia Currency",

    // Landing
    "landing.hero.title": "Every positive action has value",
    "landing.hero.subtitle":
      "Boyia App rewards learning, entrepreneurship and positive behaviour with Boyia Currency — a simple, secure and transparent internal digital unit.",
    "landing.hero.cta": "Create my account",
    "landing.hero.login": "Sign in",
    "landing.disclaimer":
      "Boyia Currency is a closed-loop internal digital unit, comparable to advanced loyalty points. It is not a bank, a cryptocurrency, or legal tender.",
    "landing.feature.learn.title": "Learn",
    "landing.feature.learn.desc":
      "Complete courses, pass quizzes and earn Boyia for every validated activity.",
    "landing.feature.earn.title": "Get rewarded",
    "landing.feature.earn.desc":
      "Challenges, missions, referrals: every effort counts and every reward is traceable.",
    "landing.feature.spend.title": "Use your Boyia",
    "landing.feature.spend.desc":
      "Pay partners by QR code, unlock courses and enjoy exclusive offers.",
    "landing.feature.trust.title": "With full confidence",
    "landing.feature.trust.desc":
      "Clear history, verifiable receipts, parental supervision and a balanced double-entry ledger.",
    "landing.how.title": "How does it work?",
    "landing.how.step1.title": "Sign up with your phone number",
    "landing.how.step1.desc":
      "A phone is all you need. SMS verification, wallet created automatically.",
    "landing.how.step2.title": "Earn Boyia",
    "landing.how.step2.desc":
      "Courses, challenges, sales, invitations: rewards land in your wallet.",
    "landing.how.step3.title": "Use them in the ecosystem",
    "landing.how.step3.desc":
      "Scan a partner merchant's QR code or unlock perks inside the app.",
    "landing.offers.title": "Current public offers",
    "landing.partners.title": "For merchants and schools",
    "landing.partners.desc":
      "Retain your customers, reward your students, measure your campaigns. Boyia offers a dedicated partner portal.",
    "landing.partners.cta": "Become a partner",
    "landing.footer.legal":
      "© 2026 Boyia — Côte d'Ivoire. Boyia Currency can only be used within the Boyia ecosystem and with authorised partners.",
    "landing.demo.badge": "Demo version — fictitious data",

    // Auth
    "auth.login.title": "Welcome back!",
    "auth.login.subtitle": "Sign in to access your wallet.",
    "auth.phone": "Phone number",
    "auth.pin": "Secret code",
    "auth.login.submit": "Sign in",
    "auth.login.noAccount": "No account yet?",
    "auth.login.signup": "Sign up",
    "auth.register.title": "Welcome to Boyia",
    "auth.register.subtitle":
      "Create your account in seconds. A verification code will be sent by SMS.",
    "auth.firstName": "First name",
    "auth.lastName": "Last name",
    "auth.country": "Country",
    "auth.birthDate": "Date of birth",
    "auth.referral": "Referral code (optional)",
    "auth.terms": "I accept the terms of use and the privacy policy.",
    "auth.register.submit": "Send my SMS code",
    "auth.otp.title": "Verification",
    "auth.otp.subtitle": "Enter the 6-digit code sent to",
    "auth.otp.hint": "Demo: use code 123456",
    "auth.otp.submit": "Verify",
    "auth.otp.error": "Incorrect code. In demo mode, use 123456.",
    "auth.pinCreate": "Transaction PIN (4 to 6 digits)",
    "auth.demo.credentials": "Demo: +2250700000042 / PIN 1234 (Awa Kouassi)",
    "auth.register.hasAccount": "Already have an account?",
    "auth.demo.note": "Demo mode: no real data is sent.",

    // Navigation
    "nav.home": "Home",
    "nav.discover": "Discover",
    "nav.scan": "Scan",
    "nav.activities": "Activities",
    "nav.profile": "Profile",

    // Home
    "home.greeting": "Hello",
    "home.balance.total": "Total balance",
    "home.balance.available": "Available",
    "home.balance.hide": "Hide balance",
    "home.balance.show": "Show balance",
    "home.balance.indicative": "indicative value",
    "home.pending.title": "Pending rewards",
    "home.pending.desc": "being validated",
    "home.actions.send": "Send",
    "home.actions.receive": "Receive",
    "home.actions.scan": "Scan",
    "home.actions.earn": "Earn",
    "home.transactions.title": "Recent transactions",
    "home.transactions.all": "See all",
    "home.challenges.title": "Active challenges",
    "home.offers.title": "Recommended offers",
    "home.level": "Level",
    "home.streak": "day streak",
    "home.scan.cta": "Scan",
    "home.menu.transfer": "Transfer",
    "home.menu.opportunities": "Opportunities",
    "home.menu.shop": "Shop",
    "home.menu.card": "Card",
    "home.menu.gifts": "Gifts",
    "home.menu.events": "Events",
    "home.menu.spending": "Spending",

    // Wallet
    "wallet.title": "Wallet",
    "wallet.available": "Available balance",
    "wallet.pending": "Pending",
    "wallet.promo": "Promotional",
    "wallet.blocked": "Blocked",
    "wallet.history": "History",
    "wallet.limits": "Account limits",
    "wallet.limits.perTx": "Per transfer",
    "wallet.limits.daily": "Per day",
    "wallet.filter.all": "All",
    "wallet.filter.received": "Received",
    "wallet.filter.sent": "Sent",
    "wallet.filter.rewards": "Rewards",
    "wallet.filter.payments": "Purchases",
    "wallet.empty": "No transactions for this filter.",
    "wallet.balanceAfter": "Balance after",
    "wallet.reference": "Reference",
    "wallet.fee": "Fee",
    "wallet.receipt": "Digital receipt",
    "wallet.receipt.verify": "Verification QR code",
    "wallet.receipt.share": "Share",
    "wallet.receipt.download": "Download",
    "wallet.status.completed": "Confirmed",
    "wallet.status.pending": "Pending",
    "wallet.status.failed": "Failed",
    "wallet.status.reversed": "Reversed",
    "wallet.type.reward": "Reward",
    "wallet.type.transfer_in": "Transfer received",
    "wallet.type.transfer_out": "Transfer sent",
    "wallet.type.payment": "Payment",
    "wallet.type.refund": "Refund",

    // Send
    "send.title": "Send Boyia",
    "send.recipient": "Recipient",
    "send.recipient.placeholder": "Phone number, username…",
    "send.recent": "Recent recipients",
    "send.lookup": "Find recipient",
    "send.suggestions": "Suggestions (demo accounts)",
    "send.amount": "Amount",
    "send.note": "Note (optional)",
    "send.note.placeholder": "Thanks for your help!",
    "send.summary": "Transfer summary",
    "send.summary.to": "To",
    "send.summary.amount": "Amount",
    "send.summary.fee": "Fee",
    "send.summary.total": "Total debited",
    "send.summary.warning":
      "Double-check the recipient: a confirmed transfer is final.",
    "send.newRecipient": "New recipient — first time you send to this contact.",
    "send.pin.title": "Confirm with your PIN",
    "send.pin.hint": "The PIN you chose at signup (demo Awa: 1234)",
    "send.pin.error": "Incorrect PIN. In demo mode, use 1234.",
    "send.continue": "Continue",
    "send.confirm": "Confirm transfer",
    "send.success.title": "Transfer complete!",
    "send.success.desc": "has received your Boyia. A receipt was generated.",
    "send.error.insufficient": "Insufficient available balance.",
    "send.error.limit": "This amount exceeds the per-transfer limit",
    "send.error.recipient": "Choose a recipient.",
    "send.error.amount": "Enter a valid amount.",
    "send.viewReceipt": "View receipt",
    "send.backHome": "Back to home",

    // Receive
    "receive.title": "Receive Boyia",
    "receive.desc": "Show this QR code or share your ID to receive a transfer.",
    "receive.username": "Username",
    "receive.copy": "Copy",
    "receive.copied": "Copied!",

    // Scan
    "scan.title": "Scan",
    "scan.desc": "Scan a partner merchant's QR code to pay with Boyia.",
    "scan.demo": "Demo: simulate a payment at Boyia Market",
    "scan.simulate": "Simulate a scan",
    "scan.pay.title": "Payment",
    "scan.pay.merchant": "Merchant",
    "scan.pay.verified": "Verified partner",
    "scan.pay.amount": "Amount due",
    "scan.pay.mixed": "Mixed payment: up to 30% in Boyia, the rest in FCFA.",
    "scan.pay.inBoyia": "Paid in Boyia",
    "scan.pay.inFcfa": "Remaining in FCFA",
    "scan.pay.confirm": "Pay",
    "scan.success": "Payment confirmed! The merchant received a real-time notification.",
    "scan.camera.note":
      "Camera access is not enabled in this web demo. Use the simulation below.",

    // Discover
    "discover.title": "Discover",
    "discover.subtitle": "Offers, partners and deals near you.",
    "discover.categories.all": "All",
    "discover.categories.food": "Food",
    "discover.categories.education": "Courses",
    "discover.categories.shopping": "Shops",
    "discover.categories.events": "Events",
    "discover.cashback": "cashback",
    "discover.discount": "off",
    "discover.validUntil": "Valid until",
    "discover.partner.verified": "Verified partner",

    // Activities
    "activities.title": "Activities",
    "activities.challenges": "Challenges",
    "activities.courses": "Courses",
    "activities.reward": "Reward",
    "activities.bonus": "Bonus",
    "activities.progress": "Progress",
    "activities.join": "Join",
    "activities.joined": "Joined",
    "activities.continue": "Continue",
    "activities.start": "Start",
    "activities.completed": "Completed",
    "activities.lessons": "lessons",
    "activities.duration": "Duration",
    "activities.level.beginner": "Beginner",
    "activities.level.intermediate": "Intermediate",
    "activities.certificate": "Certificate included",
    "activities.xp": "XP",

    // Profile
    "profile.title": "Profile",
    "profile.verification": "Verification level",
    "profile.verification.levelLabel": "Level",
    "profile.verification.level1": "Phone verified",
    "profile.verification.upgrade": "Increase my limits",
    "profile.badges": "My badges",
    "profile.referral.title": "Referral",
    "profile.referral.desc": "Invite friends and earn 25 Boyia per validated referral.",
    "profile.referral.code": "Your code",
    "profile.settings": "Settings",
    "profile.settings.language": "Language",
    "profile.settings.theme": "Appearance",
    "profile.settings.theme.light": "Light",
    "profile.settings.theme.dark": "Dark",
    "profile.settings.theme.system": "System",
    "profile.settings.notifications": "Notifications",
    "profile.settings.security": "Security",
    "profile.settings.security.desc": "PIN, biometrics, connected devices",
    "profile.parental": "Parental supervision",
    "profile.parental.desc": "Linked accounts, limits and permissions",
    "profile.support": "Help & support",
    "profile.logout": "Sign out",
    "profile.memberSince": "Member since",

    // Misc
    "common.boyia": "Boyia",
    "common.fcfa": "FCFA",
    "common.cancel": "Cancel",
    "common.back": "Back",
    "common.close": "Close",
    "common.demo": "Demo application — all data is fictitious.",
    "common.offline": "Waiting for connection — transaction not executed.",
  },
} as const;

export type TranslationKey = keyof (typeof dictionaries)["fr"];

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "boyia.locale";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "fr" || stored === "en") {
      setLocaleState(stored);
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
  }, []);

  const t = useCallback(
    (key: TranslationKey) => dictionaries[locale][key] ?? dictionaries.fr[key],
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}
