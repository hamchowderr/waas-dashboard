"use client";

import * as React from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Splits a long page into tabs, so each part fits on one screen. The open tab is kept in the address (?tab=), so a
 * link or a reload opens the same one; the page's server code passes it back as `initial`. Put a TabsContent per
 * tab in children.
 */
export function PageTabs({
  tabs,
  initial,
  label,
  children
}: {
  tabs: { value: string; label: string; count?: number }[];
  initial?: string;
  label: string;
  children: React.ReactNode;
}) {
  const first = tabs[0].value;
  const [value, setValue] = React.useState(tabs.some((t) => t.value === initial) ? initial! : first);

  const change = (next: string) => {
    setValue(next);
    const url = new URL(window.location.href);
    if (next === first) url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(window.history.state, "", url);
  };

  return (
    <Tabs value={value} onValueChange={change} className="gap-5 lg:gap-6">
      <div className="overflow-x-auto border-b">
        <TabsList variant="line" aria-label={label} className="h-10 gap-4 p-0">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="h-10 flex-none rounded-none px-0.5 text-sm group-data-horizontal/tabs:after:bottom-0">
              {t.label}
              {t.count !== undefined && <span className="text-muted-foreground font-normal tabular-nums">{t.count}</span>}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {children}
    </Tabs>
  );
}
