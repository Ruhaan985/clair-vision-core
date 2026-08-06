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

export type RankStyle = {
  label: string;
  perk: string;
  uploadMb: number;
  /** Gradient used for the badge surface. */
  gradient: string;
  /** Text/emblem colour on top of the gradient. */
  ink: string;
  /** Glow colour around the badge. */
  glow: string;
};

export const RANK_DETAILS: Record<LumenRank, RankStyle> = {
  bronze: {
    label: "Bronze", perk: "8 MB file uploads", uploadMb: 8,
    gradient: "linear-gradient(135deg,#7a3f1d,#c97b3c 55%,#f0b07a)",
    ink: "#2a1408", glow: "rgba(201,123,60,.55)",
  },
  silver: {
    label: "Silver", perk: "12 MB file uploads", uploadMb: 12,
    gradient: "linear-gradient(135deg,#6f7885,#c9d2dc 55%,#ffffff)",
    ink: "#20262e", glow: "rgba(201,210,220,.6)",
  },
  gold: {
    label: "Gold", perk: "16 MB file uploads", uploadMb: 16,
    gradient: "linear-gradient(135deg,#8a6410,#e8b528 55%,#ffe694)",
    ink: "#2e2100", glow: "rgba(232,181,40,.6)",
  },
  platinum: {
    label: "Platinum", perk: "20 MB file uploads", uploadMb: 20,
    gradient: "linear-gradient(135deg,#0f6f6a,#39d6c4 55%,#b6fff3)",
    ink: "#032b28", glow: "rgba(57,214,196,.6)",
  },
  diamond: {
    label: "Diamond", perk: "24 MB file uploads", uploadMb: 24,
    gradient: "linear-gradient(135deg,#1a4fbf,#4aa8ff 55%,#cfe8ff)",
    ink: "#04204d", glow: "rgba(74,168,255,.6)",
  },
  onyx: {
    label: "Onyx", perk: "28 MB file uploads", uploadMb: 28,
    gradient: "linear-gradient(135deg,#20232b,#4b515f 55%,#ff9a3c)",
    ink: "#ffe9d2", glow: "rgba(255,154,60,.55)",
  },
  nemesis: {
    label: "Nemesis", perk: "32 MB file uploads", uploadMb: 32,
    gradient: "linear-gradient(135deg,#4a108a,#a12ce0 55%,#ff9bff)",
    ink: "#f6e6ff", glow: "rgba(161,44,224,.65)",
  },
  arch_nemesis: {
    label: "Arch Nemesis", perk: "40 MB file uploads", uploadMb: 40,
    gradient: "linear-gradient(135deg,#04141a,#0b3f4a 50%,#12e0c8)",
    ink: "#d7fff8", glow: "rgba(18,224,200,.7)",
  },
};