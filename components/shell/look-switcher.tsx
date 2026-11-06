"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { LOOK_COOKIE, LOOKS, type Look } from "@/lib/looks";
import { cn } from "@/lib/utils";

function rememberLook(value: Look | null) {
  document.cookie = `${LOOK_COOKIE}=${value ?? ""}; path=/; max-age=${value ? 31536000 : 0}; samesite=lax`;
}

/** Preview-only bar for comparing the redesign looks; shown on sample data, never on the live dashboard. */
export function LookSwitcher({ current }: { current: Look | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const pick = (value: Look | null) => {
    rememberLook(value);
    start(() => router.refresh());
  };
  const options = [...LOOKS.map((l) => ({ value: l.value as Look | null, label: l.label, number: String(l.number) })), { value: null, label: "Today", number: "Today" }];
  return (
    <div
      data-slot="look-switcher"
      className={cn(
        "fixed bottom-3 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-1 rounded-full border border-black/10 bg-white/95 p-1 text-[13px] text-neutral-900 shadow-lg backdrop-blur",
        pending && "opacity-70"
      )}>
      <span className="px-2 font-medium text-neutral-500">Look</span>
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          onClick={() => pick(o.value)}
          aria-pressed={current === o.value}
          className={cn(
            "min-w-9 rounded-full px-3 py-1.5 font-medium whitespace-nowrap transition-colors",
            current === o.value ? "bg-neutral-900 text-white" : "hover:bg-neutral-100"
          )}>
          <span className="sm:hidden">{o.number}</span>
          <span className="max-sm:hidden">{o.number === o.label ? o.label : `${o.number} ${o.label}`}</span>
        </button>
      ))}
    </div>
  );
}
