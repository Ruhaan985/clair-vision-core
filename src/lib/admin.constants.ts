export const SUSPENSION_REASONS = [
  "Cheating",
  "Harassment or abuse",
  "Spam",
  "Hate speech",
  "Illegal activity",
  "Impersonation",
  "Other",
] as const;

export type SuspensionReason = (typeof SUSPENSION_REASONS)[number];