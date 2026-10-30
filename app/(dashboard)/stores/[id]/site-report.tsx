import { AlertTriangle, ChevronRight } from "lucide-react";

import type { SiteReport, SiteReportArea, SiteReportItem } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";

const AREA_NAMES: Record<SiteReportArea, string> = {
  forms: "Forms",
  shop: "Shop",
  crm: "Email and contacts",
  booking: "Booking",
  support: "Support",
  affiliates: "Affiliates",
  community: "Community",
};
const AREA_ORDER = Object.keys(AREA_NAMES) as SiteReportArea[];

/**
 * How the plugin's data could move to a Fluent plugin, as a badge. Colour reports the state: green when
 * Fluent can take it as it is (or already has), orange when it needs Pro or an add-on, plain when
 * there is no route.
 */
function RouteBadge({ item }: { item: SiteReportItem }) {
  const variant =
    item.onFluent || (item.fluentRoute === "native" && !item.needsPro)
      ? "success"
      : item.fluentRoute === "none"
        ? "outline"
        : "warning";
  return <Badge variant={variant}>{item.route || "No Fluent route yet"}</Badge>;
}

function ReportRow({ item }: { item: SiteReportItem }) {
  return (
    <li className="space-y-2 py-3 first:pt-0 last:pb-0">
      <div className="space-y-1">
        <p className="leading-snug">
          <span className="font-medium">{item.plugin}</span>
          {item.version && <span className="text-muted-foreground"> {item.version}</span>}
        </p>
        {item.counts.length > 0 && (
          <p className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 tabular-nums">
            {item.counts.map((count) => (
              <span key={count.name} className="whitespace-nowrap">
                {count.label}
              </span>
            ))}
          </p>
        )}
      </div>
      <RouteBadge item={item} />
      {item.blockers.length > 0 && (
        <div className="space-y-1 rounded-lg border border-orange-400 bg-orange-50 p-3 text-orange-800 dark:bg-orange-900/70 dark:text-white/80">
          <p className="flex items-center gap-1.5 font-medium">
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            Before switching
          </p>
          <ul className="list-disc space-y-1 ps-5 break-words">
            {item.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </div>
      )}
      {item.willLose.length > 0 && (
        <details className="group">
          <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center gap-1 select-none">
            <ChevronRight className="size-4 shrink-0 transition-transform group-open:rotate-90" aria-hidden />
            What a switch would lose ({item.willLose.length})
          </summary>
          <ul className="text-muted-foreground mt-2 list-disc space-y-1 ps-5 break-words">
            {item.willLose.map((loss) => (
              <li key={loss}>{loss}</li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}

/**
 * "What's on this site": the moved site's form, shop, CRM, booking, support, affiliate and community
 * plugins, grouped by area, with how much each holds, whether a Fluent plugin can bring that in, what
 * a switch would lose, and what to fix first.
 */
export function SiteReportSection({ report }: { report: SiteReport }) {
  const areas = AREA_ORDER.map((area) => ({ area, items: report.items.filter((item) => item.area === area) })).filter(
    (group) => group.items.length > 0,
  );
  const blockers = report.items.reduce((sum, item) => sum + item.blockers.length, 0);
  return (
    <section aria-labelledby="site-report-title" className="space-y-4">
      <div className="space-y-1">
        <h3 id="site-report-title" className="font-medium">
          What&apos;s on this site
        </h3>
        <p className="text-muted-foreground">
          {areas.length === 0
            ? "No form, shop, email, booking, support, affiliate or community plugins were found."
            : `Counted after the move, with how each part could move to a Fluent plugin.${
                blockers > 0 ? ` ${blockers === 1 ? "One thing needs" : `${blockers} things need`} attention before switching.` : ""
              }`}
        </p>
      </div>
      {areas.map(({ area, items }) => (
        <div key={area} className="space-y-2">
          <p className="text-muted-foreground border-b pb-1.5 text-xs font-medium">{AREA_NAMES[area]}</p>
          <ul className="divide-y">
            {items.map((item) => (
              <ReportRow key={item.slug} item={item} />
            ))}
          </ul>
        </div>
      ))}
      {report.notes.length > 0 && (
        <ul className="text-muted-foreground space-y-1 text-xs">
          {report.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
      {report.plugins.length > 0 && (
        <details className="group">
          <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center gap-1 select-none">
            <ChevronRight className="size-4 shrink-0 transition-transform group-open:rotate-90" aria-hidden />
            All active plugins ({report.plugins.length})
          </summary>
          <ul className="mt-2 space-y-1">
            {report.plugins.map((plugin) => (
              <li key={plugin.slug} className="flex items-baseline justify-between gap-4">
                <span className="min-w-0 break-words">{plugin.name}</span>
                <span className="text-muted-foreground shrink-0 tabular-nums">{plugin.version || "—"}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
