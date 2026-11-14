import { Skeleton } from "@/components/ui/skeleton";

/** A card's outline while its page loads: a chip, a title and a few lines. */
function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-4 rounded-[1.125rem] border p-5.5">
      <div className="flex items-center gap-3.5">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
      </div>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-xl" />
      ))}
    </div>
  );
}

/**
 * The page's shape while it loads, so the sheet never sits blank: overview (tiles and two columns), list (a header
 * and a table) or detail (a store's header and its two columns).
 */
export function PageSkeleton({ kind }: { kind: "overview" | "list" | "detail" }) {
  return (
    <div className="space-y-5 lg:space-y-7" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <div className="flex items-center gap-4 border-b pb-5 lg:pb-7">
        {kind === "detail" && <Skeleton className="size-14 rounded-full max-sm:hidden" />}
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
      </div>
      {kind === "overview" && (
        <div className="grid grid-cols-2 gap-3 lg:gap-5 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-36 rounded-[1.125rem]" />
          ))}
        </div>
      )}
      {kind === "list" ? (
        <CardSkeleton lines={6} />
      ) : (
        <div className="grid items-start gap-5 lg:gap-6 xl:grid-cols-3">
          <div className="space-y-5 xl:col-span-2">
            <CardSkeleton lines={3} />
            <CardSkeleton lines={2} />
          </div>
          <CardSkeleton lines={4} />
        </div>
      )}
    </div>
  );
}
