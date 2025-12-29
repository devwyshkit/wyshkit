export const ONBOARDING_STEPS = [
  "signup",
  "business",
  "bank",
  "delivery",
  "photos",
  "documents",
  "submitted",
] as const;

export type OnboardingStep = typeof ONBOARDING_STEPS[number];




