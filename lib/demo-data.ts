/**
 * Données de démonstration — entièrement fictives (cahier des charges §53).
 * En production, ces données proviennent de l'API Boyia ; aucun solde n'est
 * jamais calculé côté client, il découle du registre comptable serveur.
 */

export type TransactionType =
  | "reward"
  | "transfer_in"
  | "transfer_out"
  | "payment"
  | "refund";

export type TransactionStatus = "completed" | "pending" | "failed";

export interface Transaction {
  id: string;
  reference: string;
  type: TransactionType;
  status: TransactionStatus;
  /** Montant en Boyia, positif = crédit, négatif = débit. */
  amount: number;
  fee: number;
  counterparty: string;
  note?: string;
  dateIso: string;
  balanceAfter: number;
}

export interface DemoUser {
  publicId: string;
  firstName: string;
  lastName: string;
  username: string;
  phoneMasked: string;
  levelFr: string;
  levelEn: string;
  xp: number;
  xpNextLevel: number;
  streakDays: number;
  referralCode: string;
  memberSince: string;
  badges: { id: string; emoji: string; fr: string; en: string }[];
}

export interface Balances {
  available: number;
  pending: number;
  promotional: number;
  blocked: number;
}

export interface Recipient {
  id: string;
  name: string;
  username: string;
  phoneMasked: string;
  emoji: string;
  isNew: boolean;
}

export interface Offer {
  id: string;
  partner: string;
  category: "food" | "education" | "shopping" | "events";
  emoji: string;
  titleFr: string;
  titleEn: string;
  descFr: string;
  descEn: string;
  highlight: string;
  validUntil: string;
  verified: boolean;
}

export interface Challenge {
  id: string;
  emoji: string;
  nameFr: string;
  nameEn: string;
  descFr: string;
  descEn: string;
  reward: number;
  bonus?: number;
  progress: number;
  target: number;
  joined: boolean;
}

export interface Course {
  id: string;
  emoji: string;
  titleFr: string;
  titleEn: string;
  level: "beginner" | "intermediate";
  lessons: number;
  durationFr: string;
  durationEn: string;
  reward: number;
  progress: number;
  certificate: boolean;
}

export const demoUser: DemoUser = {
  publicId: "usr_awa2026demo",
  firstName: "Awa",
  lastName: "Kouassi",
  username: "@awa.kouassi",
  phoneMasked: "+225 07 •• •• •• 42",
  levelFr: "Exploratrice",
  levelEn: "Explorer",
  xp: 340,
  xpNextLevel: 500,
  streakDays: 5,
  referralCode: "AWA-2026",
  memberSince: "2026-03-12",
  badges: [
    { id: "b1", emoji: "🎓", fr: "Première formation", en: "First course" },
    { id: "b2", emoji: "🔥", fr: "Série de 5 jours", en: "5-day streak" },
    { id: "b3", emoji: "🤝", fr: "Première invitation", en: "First referral" },
    { id: "b4", emoji: "⭐", fr: "Exploratrice", en: "Explorer" },
  ],
};

export const initialBalances: Balances = {
  available: 1_250,
  pending: 75,
  promotional: 100,
  blocked: 0,
};

export const initialTransactions: Transaction[] = [
  {
    id: "tx_009",
    reference: "BY-2026-070801",
    type: "reward",
    status: "pending",
    amount: 75,
    fee: 0,
    counterparty: "Défi entrepreneur junior",
    note: "Validation en cours",
    dateIso: "2026-07-08T17:45:00Z",
    balanceAfter: 1_250,
  },
  {
    id: "tx_008",
    reference: "BY-2026-070702",
    type: "payment",
    status: "completed",
    amount: -180,
    fee: 0,
    counterparty: "Boyia Market",
    note: "Fournitures scolaires",
    dateIso: "2026-07-07T11:20:00Z",
    balanceAfter: 1_250,
  },
  {
    id: "tx_007",
    reference: "BY-2026-070601",
    type: "reward",
    status: "completed",
    amount: 15,
    fee: 0,
    counterparty: "Quiz — Gérer son budget",
    dateIso: "2026-07-06T15:02:00Z",
    balanceAfter: 1_430,
  },
  {
    id: "tx_006",
    reference: "BY-2026-070501",
    type: "transfer_in",
    status: "completed",
    amount: 200,
    fee: 0,
    counterparty: "Christ Aaron",
    note: "Merci pour le coup de main !",
    dateIso: "2026-07-05T09:34:00Z",
    balanceAfter: 1_415,
  },
  {
    id: "tx_005",
    reference: "BY-2026-070301",
    type: "transfer_out",
    status: "completed",
    amount: -100,
    fee: 0,
    counterparty: "Fatou Diabaté",
    note: "Billet atelier couture",
    dateIso: "2026-07-03T18:10:00Z",
    balanceAfter: 1_215,
  },
  {
    id: "tx_004",
    reference: "BY-2026-070201",
    type: "reward",
    status: "completed",
    amount: 50,
    fee: 0,
    counterparty: "Formation — Bases de l'entrepreneuriat",
    dateIso: "2026-07-02T14:00:00Z",
    balanceAfter: 1_315,
  },
  {
    id: "tx_003",
    reference: "BY-2026-063001",
    type: "refund",
    status: "completed",
    amount: 40,
    fee: 0,
    counterparty: "Chez Tantie Délices",
    note: "Commande annulée",
    dateIso: "2026-06-30T12:45:00Z",
    balanceAfter: 1_265,
  },
  {
    id: "tx_002",
    reference: "BY-2026-062801",
    type: "reward",
    status: "completed",
    amount: 25,
    fee: 0,
    counterparty: "Parrainage — Mariam T.",
    dateIso: "2026-06-28T10:15:00Z",
    balanceAfter: 1_225,
  },
  {
    id: "tx_001",
    reference: "BY-2026-062501",
    type: "reward",
    status: "completed",
    amount: 20,
    fee: 0,
    counterparty: "Inscription complétée",
    dateIso: "2026-06-25T08:00:00Z",
    balanceAfter: 1_200,
  },
];

export const demoRecipients: Recipient[] = [
  {
    id: "rcp_1",
    name: "Christ Aaron",
    username: "@christ.aaron",
    phoneMasked: "+225 05 •• •• •• 18",
    emoji: "🧑🏾‍💼",
    isNew: false,
  },
  {
    id: "rcp_2",
    name: "Fatou Diabaté",
    username: "@fatou.d",
    phoneMasked: "+225 01 •• •• •• 77",
    emoji: "👩🏾‍🎓",
    isNew: false,
  },
  {
    id: "rcp_3",
    name: "Mariam Touré",
    username: "@mariam.t",
    phoneMasked: "+225 07 •• •• •• 03",
    emoji: "👩🏾",
    isNew: true,
  },
  {
    id: "rcp_4",
    name: "Yao Kobenan",
    username: "@yao.k",
    phoneMasked: "+225 05 •• •• •• 91",
    emoji: "🧑🏿‍🔧",
    isNew: true,
  },
];

export const demoOffers: Offer[] = [
  {
    id: "off_1",
    partner: "Boyia Market",
    category: "shopping",
    emoji: "🛒",
    titleFr: "Cashback rentrée scolaire",
    titleEn: "Back-to-school cashback",
    descFr: "5 % en Boyia sur toutes les fournitures scolaires.",
    descEn: "5% back in Boyia on all school supplies.",
    highlight: "5 %",
    validUntil: "2026-09-30",
    verified: true,
  },
  {
    id: "off_2",
    partner: "Chez Tantie Délices",
    category: "food",
    emoji: "🍛",
    titleFr: "Menu étudiant en Boyia",
    titleEn: "Student menu in Boyia",
    descFr: "Jusqu'à 30 % du menu payable en Boyia, du lundi au vendredi.",
    descEn: "Pay up to 30% of the menu in Boyia, Monday to Friday.",
    highlight: "30 %",
    validUntil: "2026-08-31",
    verified: true,
  },
  {
    id: "off_3",
    partner: "Académie Ivoire Code",
    category: "education",
    emoji: "💻",
    titleFr: "Formation web à -50 %",
    titleEn: "Web course at 50% off",
    descFr: "Débloque la formation « Créer son site » avec 250 Boyia.",
    descEn: "Unlock the “Build your website” course with 250 Boyia.",
    highlight: "-50 %",
    validUntil: "2026-08-15",
    verified: true,
  },
  {
    id: "off_4",
    partner: "Festival Jeunes Talents",
    category: "events",
    emoji: "🎤",
    titleFr: "Billet en Boyia",
    titleEn: "Ticket in Boyia",
    descFr: "Réserve ta place avec 150 Boyia. Places limitées !",
    descEn: "Book your seat with 150 Boyia. Limited seats!",
    highlight: "150 ʙ",
    validUntil: "2026-07-25",
    verified: true,
  },
  {
    id: "off_5",
    partner: "Librairie du Plateau",
    category: "shopping",
    emoji: "📚",
    titleFr: "10 % de réduction",
    titleEn: "10% discount",
    descFr: "Sur tous les romans jeunesse, en payant avec Boyia.",
    descEn: "On all young-adult novels when paying with Boyia.",
    highlight: "-10 %",
    validUntil: "2026-09-01",
    verified: false,
  },
];

export const demoChallenges: Challenge[] = [
  {
    id: "chl_1",
    emoji: "🚀",
    nameFr: "Défi entrepreneur junior",
    nameEn: "Junior entrepreneur challenge",
    descFr: "Réalise 5 ventes en une semaine.",
    descEn: "Make 5 sales in one week.",
    reward: 100,
    bonus: 50,
    progress: 3,
    target: 5,
    joined: true,
  },
  {
    id: "chl_2",
    emoji: "🔥",
    nameFr: "Série de 7 jours",
    nameEn: "7-day streak",
    descFr: "Connecte-toi et termine une activité 7 jours de suite.",
    descEn: "Log in and complete an activity 7 days in a row.",
    reward: 10,
    progress: 5,
    target: 7,
    joined: true,
  },
  {
    id: "chl_3",
    emoji: "🧠",
    nameFr: "Marathon quiz",
    nameEn: "Quiz marathon",
    descFr: "Réussis 3 quiz à plus de 80 % ce mois-ci.",
    descEn: "Pass 3 quizzes with 80%+ this month.",
    reward: 45,
    progress: 1,
    target: 3,
    joined: false,
  },
  {
    id: "chl_4",
    emoji: "🤝",
    nameFr: "Ambassadeur Boyia",
    nameEn: "Boyia ambassador",
    descFr: "Invite 3 amis qui valident leur compte.",
    descEn: "Invite 3 friends who validate their account.",
    reward: 75,
    progress: 1,
    target: 3,
    joined: false,
  },
];

export const demoCourses: Course[] = [
  {
    id: "crs_1",
    emoji: "💡",
    titleFr: "Bases de l'entrepreneuriat",
    titleEn: "Entrepreneurship basics",
    level: "beginner",
    lessons: 8,
    durationFr: "2 h",
    durationEn: "2 h",
    reward: 50,
    progress: 100,
    certificate: true,
  },
  {
    id: "crs_2",
    emoji: "💰",
    titleFr: "Gérer son budget",
    titleEn: "Managing your budget",
    level: "beginner",
    lessons: 6,
    durationFr: "1 h 30",
    durationEn: "1.5 h",
    reward: 40,
    progress: 66,
    certificate: true,
  },
  {
    id: "crs_3",
    emoji: "🛍️",
    titleFr: "Vendre en ligne",
    titleEn: "Selling online",
    level: "intermediate",
    lessons: 10,
    durationFr: "3 h",
    durationEn: "3 h",
    reward: 60,
    progress: 0,
    certificate: true,
  },
  {
    id: "crs_4",
    emoji: "🗣️",
    titleFr: "Pitcher son projet",
    titleEn: "Pitching your project",
    level: "intermediate",
    lessons: 5,
    durationFr: "1 h",
    durationEn: "1 h",
    reward: 35,
    progress: 0,
    certificate: false,
  },
];

export const demoMerchant = {
  name: "Boyia Market",
  category: "shopping",
  emoji: "🛒",
  verified: true,
  /** Montant d'exemple d'un QR dynamique, en FCFA. */
  qrAmountFcfa: 4_500,
  /** Part maximale payable en Boyia (paiement mixte §15.3). */
  maxBoyiaShare: 0.3,
};
