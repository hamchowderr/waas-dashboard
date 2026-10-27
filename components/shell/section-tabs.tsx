"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import { isCurrent, linkHref, sectionOf } from "@/components/shell/nav";
import { sectionSlug } from "@/components/shell/tours";

/**
 * The pages of the current sidebar section, as tabs above the page (Stores · Backups · Activity). Drawn like the
 * Tabs component (muted track, active pill) but as links, so each tab is its own address.
 */
export function SectionTabs({ isAdmin, isReseller = false }: { isAdmin: boolean; isReseller?: boolean }) {
  const pathname = usePathname();
  const product = useSearchParams().get("product");
  const section = sectionOf(pathname, isAdmin, isReseller);
  if (!section || section.links.length < 2) return null;

  return (
    <nav aria-label={section.title} className="mb-4 overflow-x-auto lg:mb-6">
      <ul data-tour-step-id={`tabs-${sectionSlug(section.title)}`} className="bg-muted text-muted-foreground inline-flex h-9 items-center rounded-lg p-[3px] pointer-coarse:h-11">
        {section.links.map((link) => {
          const current = isCurrent(pathname, link.href);
          return (
            <li key={link.href} className="h-full">
              <Link
                href={linkHref(link, product)}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "focus-visible:ring-ring/50 flex h-full items-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap outline-none focus-visible:ring-3",
                  current
                    ? "bg-background text-foreground shadow-sm dark:border dark:border-input dark:bg-input/30"
                    : "text-foreground/60 hover:text-foreground"
                )}>
                <link.icon className="size-4" aria-hidden />
                {link.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
