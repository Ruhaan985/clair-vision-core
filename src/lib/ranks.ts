export const LUMEN_RANKS = [
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
  "onyx",
  "nemesis",
  "arch_nemesis",
] as const;

export type LumenRank = (typeof LUMEN_RANKS)[number];

export const RANK_DETAILS: Record<LumenRank, { label: string; perk: string; uploadMb: number }> = {
  bronze: { label: "Bronze", perk: "8 MB file uploads", uploadMb: 8 },
  silver: { label: "Silver", perk: "12 MB file uploads", uploadMb: 12 },
  gold: { label: "Gold", perk: "16 MB file uploads", uploadMb: 16 },
  platinum: { label: "Platinum", perk: "20 MB file uploads", uploadMb: 20 },
  diamond: { label: "Diamond", perk: "24 MB file uploads", uploadMb: 24 },
  onyx: { label: "Onyx", perk: "28 MB file uploads", uploadMb: 28 },
  nemesis: { label: "Nemesis", perk: "32 MB file uploads", uploadMb: 32 },
  arch_nemesis: { label: "Arch Nemesis", perk: "40 MB file uploads", uploadMb: 40 },
};