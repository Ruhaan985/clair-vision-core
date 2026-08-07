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
  /** Points required to reach this rank. */
  points: number;
  /** Short human perk/threshold label. */
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
    label: "Bronze", points: 0, perk: "0 pts", uploadMb: 8,
    gradient: "linear-gradient(135deg,#7a3f1d,#c97b3c 55%,#f0b07a)",
    ink: "#2a1408", glow: "rgba(201,123,60,.55)",
  },
  silver: {
    label: "Silver", points: 200, perk: "200 pts", uploadMb: 12,
    gradient: "linear-gradient(135deg,#6f7885,#c9d2dc 55%,#ffffff)",
    ink: "#20262e", glow: "rgba(201,210,220,.6)",
  },
  gold: {
    label: "Gold", points: 800, perk: "800 pts", uploadMb: 16,
    gradient: "linear-gradient(135deg,#8a6410,#e8b528 55%,#ffe694)",
    ink: "#2e2100", glow: "rgba(232,181,40,.6)",
  },
  platinum: {
    label: "Platinum", points: 1800, perk: "1,800 pts", uploadMb: 20,
    gradient: "linear-gradient(135deg,#0f6f6a,#39d6c4 55%,#b6fff3)",
    ink: "#032b28", glow: "rgba(57,214,196,.6)",
  },
  diamond: {
    label: "Diamond", points: 3200, perk: "3,200 pts", uploadMb: 24,
    gradient: "linear-gradient(135deg,#1a4fbf,#4aa8ff 55%,#cfe8ff)",
    ink: "#04204d", glow: "rgba(74,168,255,.6)",
  },
  onyx: {
    label: "Onyx", points: 5000, perk: "5,000 pts", uploadMb: 28,
    gradient: "linear-gradient(135deg,#20232b,#4b515f 55%,#ff9a3c)",
    ink: "#ffe9d2", glow: "rgba(255,154,60,.55)",
  },
  nemesis: {
    label: "Nemesis", points: 7200, perk: "7,200 pts", uploadMb: 32,
    gradient: "linear-gradient(135deg,#4a108a,#a12ce0 55%,#ff9bff)",
    ink: "#f6e6ff", glow: "rgba(161,44,224,.65)",
  },
  arch_nemesis: {
    label: "Arch Nemesis", points: 10000, perk: "10,000 pts", uploadMb: 40,
    gradient: "linear-gradient(135deg,#04141a,#0b3f4a 50%,#12e0c8)",
    ink: "#d7fff8", glow: "rgba(18,224,200,.7)",
  },
};

export const MAX_RANK_POINTS = RANK_DETAILS.arch_nemesis.points;

export function rankForPoints(points: number): LumenRank {
  let current: LumenRank = "bronze";
  for (const r of LUMEN_RANKS) {
    if (points >= RANK_DETAILS[r].points) current = r;
  }
  return current;
}

export function nextRank(rank: LumenRank): LumenRank | null {
  const i = LUMEN_RANKS.indexOf(rank);
  return i >= 0 && i < LUMEN_RANKS.length - 1 ? LUMEN_RANKS[i + 1]! : null;
}

/** Progress (0-1) toward the next rank. */
export function rankProgress(points: number) {
  const rank = rankForPoints(points);
  const next = nextRank(rank);
  if (!next) return { rank, next: null as LumenRank | null, pct: 1, remaining: 0 };
  const from = RANK_DETAILS[rank].points;
  const to = RANK_DETAILS[next].points;
  const pct = Math.max(0, Math.min(1, (points - from) / (to - from)));
  return { rank, next, pct, remaining: Math.max(0, to - points) };
}
