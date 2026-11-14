"use client";

import * as React from "react";
import { CircleAlertIcon, CircleCheckIcon, CircleXIcon, FileTextIcon, ScanSearchIcon, SearchIcon } from "lucide-react";

import { reportEmail, type CheckStatus, type Report } from "@/lib/website-check";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardIcon } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "cn";
import { checkProspectSite } from "./actions";
import { CopyButton } from "./kit-ui";

export const STATUS_ICON: Record<CheckStatus, { icon: typeof CircleCheckIcon; className: string; label: string }> = {
  pass: { icon: CircleCheckIcon, className: "text-green-600", label: "Good" },
  warn: { icon: CircleAlertIcon, className: "text-amber-600 dark:text-amber-400", label: "Could be better" },
  fail: { icon: CircleXIcon, className: "text-rose-600", label: "Needs fixing" }
};

const scoreTone = (score: number) => (score >= 80 ? "pass" : score >= 50 ? "warn" : "fail") as CheckStatus;

/** The score as a ring, coloured by how it did. */
export function ScoreRing({ score, size = 96 }: { score: number; size?: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" className="stroke-neutral-200 dark:stroke-neutral-800" />
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(score / 100) * c} ${c}`} stroke="currentColor" className={STATUS_ICON[scoreTone(score)].className} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl leading-none font-bold tabular-nums">{score}</span>
        <span className="text-muted-foreground text-xs">of 100</span>
      </div>
    </div>
  );
}

export function WebsiteCheck({
  productId,
  sender,
  brand,
  initialUrl
}: {
  productId: string;
  sender: string | null;
  brand: string;
  /** Checks this address as soon as the check opens (from the prospect finder). */
  initialUrl?: string;
}) {
  const [url, setUrl] = React.useState(initialUrl ?? "");
  const [report, setReport] = React.useState<Report | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  const check = React.useCallback((address: string) => {
    start(async () => {
      const result = await checkProspectSite(address);
      if (result.ok) setReport(result.report);
      else {
        setReport(null);
        setError(result.error);
      }
    });
  }, []);

  const run = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    check(url);
  };

  // The check is remounted for each prospect, so this runs once per address.
  React.useEffect(() => {
    if (initialUrl) check(initialUrl);
  }, [initialUrl, check]);

  return (
    <div className="space-y-4 lg:space-y-6">
      <Card>
        <CardHeader>
          <CardIcon>
            <ScanSearchIcon />
          </CardIcon>
          <CardTitle>Check a prospect&apos;s website</CardTitle>
          <CardDescription>
            Enter their address for a free report on what&apos;s holding their site back. Send it with the email below, in your name. It&apos;s often the easiest way to start the conversation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={run} className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="joesplumbing.com"
              aria-label="Website address"
              inputMode="url"
              autoComplete="off"
              className="sm:max-w-md"
            />
            <Button type="submit" disabled={pending || !url.trim()}>
              {pending ? <Spinner data-icon="inline-start" /> : <SearchIcon data-icon="inline-start" />}
              {pending ? "Checking…" : "Check website"}
            </Button>
          </form>
          {error && <p className="text-destructive mt-3 text-sm">{error}</p>}
        </CardContent>
      </Card>

      {report && (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center gap-4">
              <ScoreRing score={report.score} />
              <div className="min-w-0 space-y-1">
                <CardTitle className="truncate">{report.host}</CardTitle>
                <CardDescription>
                  {report.checks.filter((c) => c.status !== "pass").length
                    ? `${report.checks.filter((c) => c.status === "fail").length} things need fixing and ${report.checks.filter((c) => c.status === "warn").length} could be better.`
                    : "Everything we check looks good."}
                  {report.builder ? ` Built with ${report.builder}.` : ""}
                </CardDescription>
                <Button variant="outline" size="sm" asChild className="mt-1">
                  <a href={`/print/check?product=${encodeURIComponent(productId)}&url=${encodeURIComponent(report.url)}`} target="_blank" rel="noreferrer">
                    <FileTextIcon data-icon="inline-start" />
                    Printable report
                  </a>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
          <Card className="lg:sticky lg:top-20">
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div className="space-y-1">
                <CardTitle>Email to send</CardTitle>
                <CardDescription>Attach the printable report.</CardDescription>
              </div>
              <CopyButton text={reportEmail(report, { sender, brand })} label="the email" />
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm whitespace-pre-line">{reportEmail(report, { sender, brand })}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

const order = (s: CheckStatus) => (s === "fail" ? 0 : s === "warn" ? 1 : 2);
