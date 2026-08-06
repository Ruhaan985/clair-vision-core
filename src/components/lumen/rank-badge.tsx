import { RANK_DETAILS, type LumenRank } from "@/lib/ranks";
import archNemesisAsset from "@/assets/arch-nemesis.png.asset.json";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "px-2 py-0.5 text-[10px] gap-1",
  md: "px-2.5 py-1 text-xs gap-1.5",
} as const;

export function RankBadge({
  rank,
  size = "sm",
  showPerk = false,
  className,
}: {
  rank: LumenRank;
  size?: keyof typeof SIZES;
  showPerk?: boolean;
  className?: string;
}) {
  const r = RANK_DETAILS[rank];
  const isArch = rank === "arch_nemesis";
  return (
    <span
      title={`${r.label} · ${r.perk}`}
      className={cn(
        "inline-flex items-center rounded-full font-semibold uppercase tracking-wider",
        SIZES[size],
        className,
      )}
      style={{
        background: r.gradient,
        color: r.ink,
        boxShadow: `0 0 0 1px ${r.glow}, 0 0 14px ${r.glow}`,
      }}
    >
      {isArch ? (
        <img
          src={archNemesisAsset.url}
          alt=""
          className={cn("shrink-0 object-contain", size === "sm" ? "h-3 w-4" : "h-4 w-6")}
        />
      ) : (
        <span
          aria-hidden
          className={cn("shrink-0 rotate-45 rounded-[2px]", size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5")}
          style={{ background: r.ink, opacity: 0.75 }}
        />
      )}
      <span>{r.label}</span>
      {showPerk && <span className="font-medium normal-case opacity-80">· {r.perk}</span>}
    </span>
  );
}
