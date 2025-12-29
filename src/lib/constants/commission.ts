// Commission rates (Swiggy-style)
export const COMMISSION_RATES = {
  DEFAULT: 0.18, // 18% default
  LOW: 0.15, // 15% for high volume
  MEDIUM: 0.18, // 18% standard
  HIGH: 0.20, // 20% for new vendors
  PREMIUM: 0.22, // 22% for premium category
} as const;

export const DEFAULT_COMMISSION_RATE = COMMISSION_RATES.DEFAULT;




