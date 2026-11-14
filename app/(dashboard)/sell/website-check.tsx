"use client";

import * as React from "react";
import { CircleAlertIcon, CircleCheckIcon, CircleXIcon, FileTextIcon } from "lucide-react";

import type { CheckStatus } from "@/lib/api/types";
import { reportEmail, type Report } from "@/lib/website-check";
import { Button } from "@/components/ui/button";
import { cn } from "cn";
import { CopyButton } from "./kit-ui";

export const STATUS_ICON: Record<CheckStatus, { icon: typeof CircleCheckIcon; className: string; label: string }> = {
  pass: { icon: CircleCheckIcon, className: "text-green-600", label: "Good" },
  warn: { icon: CircleAlertIcon, className: "text-amber-600 dark:text-amber-400", label: "Could be better" },
  fail: { icon: CircleXIcon, className: "text-rose-600", label: "Needs fixing" }
};

const scoreTone = (score: number) => (score >= 80 ? "pass" : score >= 50 ? "warn" : "fail") as CheckStatus;

/** The score as a ring, coloured by how it did. */
export function ScoreRing({ score, size = 96, compact = false }: { score: number; size?: number; compact?: boolean }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" className="stroke-neutral-200 dark:stroke-neutral-800" />
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(score / 100) * c} ${c}`} stroke="currentColor" className={STATUS_ICON[scoreTone(score)].className} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("leading-none font-bold tabular-nums", compact ? "text-xs" : "text-2xl")}>{score}</span>
        {!compact && <span className="text-muted-foreground text-xs">of 100</span>}
      </div>
    </div>
  );
}

/** A prospect's website check, from when its website was read: the checks, worst first, and the email to send with it. */
export function WebsiteReport({ productId, prospectId, report, sender, brand }: { productId: string; prospectId: string; report: Report; sender: string | null; brand: string }) {
  const email = reportEmail(report, { sender, brand });
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-3">
        <div className="flex items-center gap-4">
          <ScoreRing score={report.score} size={80} />
          <div className="min-w-0 space-y-1">
            <p className="truncate font-medium">{report.host}</p>
            <p className="text-muted-foreground text-sm">
              {report.checks.filter((c) => c.status !== "pass").length
                ? `${report.checks.filter((c) => c.status === "fail").length} things need fixing and ${report.checks.filter((c) => c.status === "warn").length} could be better.`
                : "Everything we check looks good."}
              {report.builder ? ` Built with ${report.builder}.` : ""}
            </p>
            <Button variant="outline" size="sm" asChild>
              <a href={`/print/check?product=${encodeURIComponent(productId)}&prospect=${encodeURIComponent(prospectId)}`} target="_blank" rel="noreferrer">
                <FileTextIcon data-icon="inline-start" />
                Printable Report
              </a>
            </Button>
          </div>
        </div>
        <ul className="divide-y rounded-lg border">
          {[...report.checks].sort((a, b) => order(a.status) - order(b.status)).map((c) => {
            const s = STATUS_ICON[c.status];
            return (
              <li key={c.id} className="flex gap-3 px-3 py-2.5">
                <s.icon className={cn("mt-0.5 size-4 shrink-0", s.className)} aria-label={s.label} />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{c.title}</p>
                  <p className="text-muted-foreground text-sm">{c.detail}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="space-y-2 rounded-lg border p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium">Email to send</p>
            <p className="text-muted-foreground text-xs">Attach the printable report.</p>
          </div>
          <CopyButton text={email} label="the email" />
        </div>
        <p className="text-muted-foreground text-sm whitespace-pre-line">{email}</p>
      </div>
    </div>
  );
}

const order = (s: CheckStatus) => (s === "fail" ? 0 : s === "warn" ? 1 : 2);
