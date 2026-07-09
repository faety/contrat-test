/**
 * Paramètres globaux de la plateforme.
 * En production, ces valeurs proviennent de l'API d'administration
 * (valeur de référence configurable — cahier des charges §6.4).
 */
export const BOYIA_CONFIG = {
  /** 1 Boyia = X FCFA de valeur d'utilisation interne (100 Boyia = 1 000 FCFA). */
  fcfaPerBoyia: 10,
  /** Limite de transfert par opération pour un compte de niveau 1. */
  transferLimitPerTx: 500,
  /** Limite quotidienne de transfert pour un compte de niveau 1. */
  transferDailyLimit: 1_000,
  /**
   * Fonctions réglementées — désactivées tant que l'autorisation
   * juridique n'est pas obtenue (cahier des charges §37).
   */
  featureFlags: {
    topUpWithCash: false,
    cashOut: false,
    mobileMoney: false,
    internationalTransfer: false,
    donations: false,
  },
} as const;

export function boyiaToFcfa(boyia: number): number {
  return boyia * BOYIA_CONFIG.fcfaPerBoyia;
}
