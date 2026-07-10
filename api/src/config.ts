/** Configuration centralisée — toutes les valeurs proviennent de l'environnement. */
export const config = {
  port: Number.parseInt(process.env.PORT ?? "4000", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction: process.env.NODE_ENV === "production",
  jwtSecret: process.env.JWT_SECRET ?? "boyia-dev-secret-do-not-use-in-prod",
  accessTokenTtl: "15m",
  refreshTokenTtl: "7d",
  dbDriver: (process.env.DB_DRIVER ?? "sqlite") as "sqlite" | "postgres",
  dbPath: process.env.DB_PATH ?? "./data/boyia.sqlite",
  databaseUrl: process.env.DATABASE_URL,
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  /** Valeur de référence interne : 1 Boyia = 10 FCFA (§6.4, configurable). */
  fcfaPerBoyia: 10,
  /** Limites de niveau 1 (§10, §35.4). */
  transferLimitPerTx: 500,
  transferDailyLimit: 1_000,
  /** OTP fixe hors production pour la démo. */
  demoOtp: "123456",
  /** Fonctions réglementées désactivées (§37). */
  featureFlags: {
    topUpWithCash: false,
    cashOut: false,
    mobileMoney: false,
    internationalTransfer: false,
  },
} as const;
