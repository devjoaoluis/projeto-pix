/**
 * Parâmetros das regras de detecção de fraude.
 * Ajuste livremente — cada regra tem um peso (weight). A soma dos
 * pesos das regras disparadas é o "score" da transação.
 */
export const FRAUD_RULES = {
  // Regra 1 — Volume anormal de envios em janela curta
  HIGH_VOLUME_SHORT_WINDOW: {
    windowMinutes: 30,
    maxTransfers: 5,
    weight: 30,
  },

  // Regra 2 — Valor individual muito alto
  HIGH_AMOUNT: {
    threshold: 5000,
    avgMultiplier: 10,
    weight: 20,
  },

  // Regra 3 — Horário atípico + valor alto
  ODD_HOUR_HIGH_AMOUNT: {
    startHour: 0,
    endHour: 6,
    minAmount: 2000,
    weight: 15,
  },

  // Regra 4 — Fracionamento (structuring)
  STRUCTURING: {
    windowMinutes: 60,
    totalThreshold: 5000,
    individualRatio: 0.5,
    minTransactions: 3,
    weight: 30,
  },

  // Regra 5 — Destinatário com chave PIX recém-criada
  NEW_PIX_KEY: {
    maxAgeHours: 24,
    weight: 20,
  },

  // Regra 6 — Destinatário bloqueado
  BLOCKED_RECEIVER: {
    weight: 40,
  },

  // Regra 7 — Velocidade entrada/saída (conta laranja)
  RAPID_IN_OUT: {
    windowMinutes: 30,
    ratio: 0.9,
    weight: 35,
  },

  // Regra 8 — Muitos destinatários diferentes
  MANY_RECEIVERS: {
    windowMinutes: 120,
    maxDistinct: 5,
    weight: 25,
  },

  // Regra 9 — Envio para si mesmo via contas diferentes
  SELF_TRANSFER_DIFFERENT_ACCOUNTS: {
    weight: 30,
  },
} as const;

/** Score mínimo para bloquear automaticamente a conta remetente. */
export const FRAUD_BLOCK_THRESHOLD = 70;