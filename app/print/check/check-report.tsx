"use client";

import * as React from "react";
import { PrinterIcon } from "lucide-react";

import type { Report } from "@/lib/website-check";
import { Button } from "@/components/ui/button";
import { cn } from "cn";
import { STATUS_ICON, ScoreRing } from "../../(dashboard)/sell/website-check";
import { Brand, Contact } from "../sell/print-sheet";

type Props = {
  report: Report | null;
  error: string | null;
  brand: string;
  color: string | null;
  logo: string | null;
  support: string | null;
  shop: string | null;
  sender: string | null;
};

const ORDER = { fail: 0, warn: 1, pass: 2 } as const;

export function CheckReport({ report, error, brand, color, logo, support, shop, sender }: Props) {
  React.useEffect(() => {
    if (report) document.title = `${brand} website check for ${report.host}`;
  }, [report, brand]);
  const style = { "--brand": color ?? "#171717" } as React.CSSProperties;

  return (
    <div style={style} className="min-h-screen bg-neutral-100 py-6 print:bg-white print:py-0">
      <style>{`@page { size: letter; margin: 0; }`}</style>
      <div className="mx-auto mb-4 flex max-w-[8.5in] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <p className="text-sm text-neutral-600">Save as PDF from the print window, then attach it to your email.</p>
        <Button size="sm" onClick={() => window.print()} disabled={!report}>
          <PrinterIcon data-icon="inline-start" />
          Print or save as PDF
        </Button>
      </div>
      <article className="mx-auto flex min-h-[11in] w-full max-w-[8.5in] flex-col bg-white text-neutral-900 shadow-sm [print-color-adjust:exact] print:shadow-none">
        <header className="flex items-center justify-between px-12 pt-10">
          <Brand brand={brand} logo={logo} />
          <span className="text-xs tracking-wide text-neutral-500 uppercase">Website check</span>
        </header>
        {!report ? (
          <p className="px-12 pt-12 text-lg">{error}</p>
        ) : (
          <>
            <section className="flex flex-col gap-6 px-12 pt-10 sm:flex-row sm:items-center">
              <ScoreRing score={report.score} size={120} />
              <div>
                <div className="mb-3 h-1 w-16 rounded-full bg-[var(--brand)]" />
                <h1 className="text-3xl leading-tight font-bold tracking-tight">{report.host}</h1>
                <p className="mt-2 text-neutral-600">
                  Checked {new Date(report.checkedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.
                  {report.builder ? ` Built with ${report.builder}.` : ""}
                </p>
              </div>
            </section>
            <section className="px-12 pt-8">
              <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200">
                {[...report.checks].sort((a, b) => ORDER[a.status] - ORDER[b.status]).map((c) => {
                  const s = STATUS_ICON[c.status];
                  return (
                    <li key={c.id} className="flex gap-3 px-4 py-3 break-inside-avoid">
                      <s.icon className={cn("mt-0.5 size-5 shrink-0", s.className)} aria-hidden />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          {c.title} <span className="font-normal text-neutral-500">· {s.label}</span>
                        </p>
                        <p className="text-sm text-neutral-600">{c.detail}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          </>
        )}
        <footer className="mt-auto flex items-end justify-between gap-6 border-t border-neutral-200 px-12 py-8">
          <div>
            <p className="text-lg font-semibold">Want these fixed?</p>
            <p className="text-sm text-neutral-600">We&apos;ll show you a fixed version of your site, free.</p>
          </div>
          <Contact sender={sender} support={support} shop={shop} />
        </footer>
      </article>
    </div>
  );
}
