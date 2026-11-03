import Link from "next/link";
import { CheckIcon, ChevronRight, HourglassIcon } from "lucide-react";

import type { SetupChecklist, SetupStep } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/** Where a step is done in the dashboard, with the button's words. A step with none is done on the shop itself. */
const STEP_LINKS: Record<string, { href: string; label: string }> = {
  "shop-connected": { href: "/keys", label: "Get your key" },
  "starting-site": { href: "/versions", label: "Pick a version" },
  brand: { href: "/branding", label: "Add brand" },
  team: { href: "/team", label: "Invite" },
  "partner-key": { href: "/reseller?tab=keys", label: "Make a key" }
};

/** The link for a step, opened on one storefront when given. */
export function stepLink(step: SetupStep, productId?: string): { href: string; label: string } | null {
  const link = STEP_LINKS[step.key];
  if (!link || step.state === "done") return null;
  if (!productId || link.href.startsWith("/reseller")) return link;
  return { ...link, href: `${link.href}${link.href.includes("?") ? "&" : "?"}product=${encodeURIComponent(productId)}` };
}

/** The steps, each ticked or with what to do and the page that does it. */
export function SetupSteps({ steps, productId, className }: { steps: SetupStep[]; productId?: string; className?: string }) {
  return (
    <ol className={cn("grid gap-2 lg:grid-cols-2", className)}>
      {steps.map((step) => {
        const link = stepLink(step, productId);
        const done = step.state === "done";
        return (
          <li key={step.key} className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border",
                done && "border-green-600 bg-green-600 text-white dark:border-green-500 dark:bg-green-500",
                step.state === "not-reported" && "border-dashed"
              )}>
              {done ? <CheckIcon className="size-3.5" aria-label="Done" /> : <span className="sr-only">Not done</span>}
            </span>
            <span className="min-w-0 flex-1 text-sm">
              <span className={cn("block font-medium", done && "text-muted-foreground")}>{step.label}</span>
              <span className="text-muted-foreground block text-xs">{step.detail}</span>
            </span>
            {step.state === "not-reported" && (
              <Badge variant="outline" className="text-muted-foreground shrink-0 font-normal">
                Coming soon
              </Badge>
            )}
            {link && (
              <Link
                href={link.href}
                className="text-primary inline-flex shrink-0 items-center gap-0.5 text-sm font-medium underline-offset-4 hover:underline pointer-coarse:min-h-11">
                {link.label}
                <ChevronRight className="size-4" aria-hidden />
              </Link>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** "6 of 10" with a bar, and a Stuck badge after a week without progress. */
/** hideStuck: on a customer's own view, where the badge would only nag. */
export function SetupProgress({ setup, className, hideStuck = false }: { setup: SetupChecklist; className?: string; hideStuck?: boolean }) {
  const stuck = setup.stuck && !hideStuck;
  const finished = setup.done === setup.total;
  const share = Math.round((setup.done / Math.max(setup.total, 1)) * 100);
  return (
    <div className={cn("min-w-28 space-y-1.5 text-sm", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="tabular-nums">
          {setup.done} of {setup.total}
        </span>
        {stuck && (
          <Badge variant="warning" className="gap-1 px-1.5 py-0 text-[11px]">
            <HourglassIcon className="size-3" aria-hidden />
            Stuck
          </Badge>
        )}
        {finished && <span className="text-xs font-medium text-green-700 dark:text-green-400">Set up</span>}
      </div>
      <div className="bg-muted h-1.5 overflow-hidden rounded-full">
        <div
          className={cn("h-full rounded-full", finished ? "bg-green-600 dark:bg-green-400" : stuck ? "bg-orange-500" : "bg-primary")}
          style={{ width: `${share}%` }}
        />
      </div>
    </div>
  );
}
