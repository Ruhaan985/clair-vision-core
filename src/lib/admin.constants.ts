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

/** Fixed point grants an admin can hand out from the console. */
export const POINT_GRANTS = [50, 100, 250, 500, 1000] as const;