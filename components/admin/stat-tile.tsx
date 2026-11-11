import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Status colours only (DESIGN.md, Status colours): green is fine, amber is moving, rose needs someone. */
const TONES = {
  neutral: "bg-card text-foreground/70",
  success: "bg-green-600/12 text-green-700 dark:bg-green-400/15 dark:text-green-300",
  warning: "bg-amber-500/15 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300",
  danger: "bg-rose-600/12 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300"
} as const;

type StatTone = keyof typeof TONES;

export type Stat = {
  label: string;
  value: number;
  note?: string;
  icon?: LucideIcon;
  /** The colour of the icon chip; a tile showing zero problems stays neutral. */
  tone?: StatTone;
  href?: string;
};

/** One number with its label: the same tile on the Overview and Storefronts pages. */
function StatTile({ stat }: { stat: Stat }) {
  const body = (
    <>
      {stat.icon && (
        <span className="flex items-center justify-between">
          <span data-slot="tile-icon" className={cn("flex size-10 items-center justify-center rounded-full", TONES[stat.tone ?? "neutral"])}>
            <stat.icon className="size-4.5" aria-hidden />
          </span>
          {stat.href && (
            <ChevronRight className="text-muted-foreground size-4 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden />
          )}
        </span>
      )}
      <span>
        <span className="block text-3xl font-extrabold tracking-[-0.03em] tabular-nums">{stat.value}</span>
        <span className="block text-sm font-semibold">{stat.label}</span>
        {stat.note && <span className="text-muted-foreground block text-xs">{stat.note}</span>}
      </span>
    </>
  );
  const shape = "bg-muted flex h-full flex-col gap-3 rounded-[1.125rem] p-4 sm:p-5";
  if (!stat.href) return <div data-slot="tile" className={shape}>{body}</div>;
  return (
    <Link
      data-slot="tile"
      href={stat.href}
      className={cn(
        shape,
        "group hover:bg-accent focus-visible:ring-ring/50 transition-colors focus-visible:ring-3 focus-visible:outline-none motion-reduce:transition-none"
      )}>
      {body}
    </Link>
  );
}

/** A row of tiles: two across on a phone and the whole row from xl; three tiles always sit in one row. */
export function StatTiles({ stats, label }: { stats: Stat[]; label: string }) {
  return (
    <ul data-slot="tiles" className={cn("grid grid-cols-2 gap-3 lg:gap-5", stats.length === 3 ? "grid-cols-3" : "xl:grid-cols-4")} aria-label={label}>
      {stats.map((stat) => (
        <li key={stat.label}>
          <StatTile stat={stat} />
        </li>
      ))}
    </ul>
  );
}
