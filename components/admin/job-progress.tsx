"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, XIcon } from "lucide-react";

import type { JobProgress } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

/** What the job is doing, as the card's title. */
const JOB_TITLES: Record<string, string> = {
  "tenant.create": "Making this site",
  "tenant.restore": "Bringing this site back",
  "tenant.rollback": "Restoring from a backup",
  "tenant.move": "Updating to the new version",
  "tenant.domains": "Changing the web address",
  "tenant.update": "Saving the new settings",
  "tenant.backup": "Saving a backup",
  "tenant.suspend": "Saving a backup before pausing",
  "tenant.delete": "Removing this site"
};

export function jobTitle(job: string): string {
  return JOB_TITLES[job] ?? "Working on this site";
}

/** How far along the bar is: half of the current step counts, so it moves as soon as a step starts. */
export function progressShare(p: JobProgress): number {
  return Math.round(((p.index - (p.failedAt ? 1 : 0.5)) / Math.max(p.total, 1)) * 100);
}

/** "1m 05s", from milliseconds. */
function duration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  return m ? `${m}m ${String(s % 60).padStart(2, "0")}s` : `${s}s`;
}

/** The time now, once a second; null until the page runs in the browser, so the server's render matches. */
function useNow(active: boolean): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const timer = active ? setInterval(tick, 1000) : undefined;
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [active]);
  return now;
}

/** Fetches the page again every few seconds while a job runs, so the progress and then "Ready" show on their own. */
export function AutoRefresh({ active, everyMs = 3000 }: { active: boolean; everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, everyMs);
    return () => clearInterval(timer);
  }, [active, everyMs, router]);
  return null;
}

/** The bar a running job shows on its store's page: the step it's on, every step with ticks, and the time so far. */
/** `waiting`: the store is Pending but its job hasn't started. `gaveUp`: the store is Failed, so no retry is coming. */
export function JobProgressCard({
  progress,
  waiting = false,
  gaveUp = false
}: {
  progress: JobProgress | null;
  waiting?: boolean;
  gaveUp?: boolean;
}) {
  const failed = !!progress?.failedAt;
  const now = useNow(!failed && (!!progress || waiting));
  if (!progress) {
    if (!waiting) return null;
    return (
      <Card data-testid="job-progress">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Spinner className="text-muted-foreground" />
            Waiting to start
          </CardTitle>
          <CardDescription>This job is next in line. It starts in a moment, and this page updates on its own.</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  const share = progressShare(progress);
  const started = Date.parse(progress.startedAt);
  const ended = progress.failedAt ? Date.parse(progress.failedAt) : now;
  const steps = progress.steps.length ? progress.steps : [progress.label];
  const current = progress.steps.length ? progress.index - 1 : 0;
  return (
    <Card data-testid="job-progress" aria-live="polite">
      <CardHeader>
        <CardTitle>{failed ? `${jobTitle(progress.job)}: something went wrong` : jobTitle(progress.job)}</CardTitle>
        <CardDescription>
          {failed && gaveUp
            ? `It stopped at "${progress.label}". We've been sent an email about it and will sort it out, so you don't need to do anything.`
            : failed
              ? `It hit a problem at "${progress.label}" and is trying again on its own.`
              : "This page updates on its own. You can leave it and come back."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
            <span className="font-medium">
              Step {progress.index} of {progress.total}: {progress.label}
            </span>
            {ended !== null && (
              <span className="text-muted-foreground tabular-nums">
                {failed ? `Ran for ${duration(ended - started)}` : `${duration(ended - started)} so far`}
              </span>
            )}
          </div>
          <div
            className="bg-muted h-2 overflow-hidden rounded-full"
            role="progressbar"
            aria-label={jobTitle(progress.job)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={share}>
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none",
                failed ? "bg-rose-600 dark:bg-rose-400" : "bg-primary"
              )}
              style={{ width: `${share}%` }}
            />
          </div>
        </div>
        <ol className="grid gap-2">
          {steps.map((label, i) => {
            const done = i < current;
            const active = i === current;
            return (
              <li key={label} className="flex items-center gap-3 text-sm">
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border",
                    done && "border-green-600 bg-green-600 text-white dark:border-green-500 dark:bg-green-500",
                    active && failed && "border-rose-600 bg-rose-600 text-white dark:border-rose-400 dark:bg-rose-400"
                  )}>
                  {done ? (
                    <CheckIcon className="size-3.5" aria-label="Done" />
                  ) : active && failed ? (
                    <XIcon className="size-3.5" aria-label="Stopped" />
                  ) : active ? (
                    <Spinner className="size-3.5" aria-label="In progress" />
                  ) : (
                    <span className="sr-only">Not started</span>
                  )}
                </span>
                <span className={cn(done && "text-muted-foreground", active && "font-medium", !done && !active && "text-muted-foreground")}>
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

/** The small bar under a store's status in the stores list. */
export function JobProgressInline({ progress }: { progress: JobProgress }) {
  const failed = !!progress.failedAt;
  return (
    <div className="w-44 space-y-1" title={`Step ${progress.index} of ${progress.total}: ${progress.label}`}>
      <div className="flex items-center gap-2">
        <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none",
              failed ? "bg-rose-600 dark:bg-rose-400" : "bg-primary"
            )}
            style={{ width: `${progressShare(progress)}%` }}
          />
        </div>
        <span className="text-muted-foreground text-xs tabular-nums">
          {progress.index} of {progress.total}
        </span>
      </div>
      <p className={cn("truncate text-xs", failed ? "text-destructive" : "text-muted-foreground")}>
        {failed ? `Problem at: ${progress.label}` : progress.label}
      </p>
    </div>
  );
}
