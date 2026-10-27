"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { CompassIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TourProvider, useTour } from "@/components/ui/tour";
import { tourFor, tourId, type TourKind } from "@/components/shell/tours";

const TourKindContext = React.createContext<TourKind>("seller");

const seenKey = (kind: TourKind) => `anypress:tour:${tourId(kind)}:seen`;

/**
 * The guided tour for this kind of account. It starts by itself the first time someone opens the Overview in this
 * browser; after that, "Take the tour" (account menu and Overview) starts it again.
 */
export function DashboardTour({ kind, canChange, children }: { kind: TourKind; canChange: boolean; children: React.ReactNode }) {
  const product = useSearchParams().get("product");
  const tours = React.useMemo(() => [tourFor({ kind, product, canChange })], [kind, product, canChange]);
  return (
    <TourKindContext.Provider value={kind}>
      <TourProvider tours={tours}>
        <FirstVisit kind={kind} />
        {children}
      </TourProvider>
    </TourKindContext.Provider>
  );
}

function FirstVisit({ kind }: { kind: TourKind }) {
  const tour = useTour();
  const pathname = usePathname();
  React.useEffect(() => {
    if (pathname !== "/") return;
    try {
      if (localStorage.getItem(seenKey(kind))) return;
    } catch {
      // Storage blocked (private window): skip the automatic start; the button still works.
      return;
    }
    // Give the page a moment to paint the cards the first steps point at. Marked as seen only once it starts, so an
    // effect that is cleaned up early (a quick navigation) doesn't use up the first visit.
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(seenKey(kind), new Date().toISOString());
      } catch {}
      tour.start(tourId(kind));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [kind, pathname, tour]);
  return null;
}

/** Starts the tour from the beginning. */
export function useStartTour() {
  const tour = useTour();
  const kind = React.useContext(TourKindContext);
  return React.useCallback(() => tour.start(tourId(kind)), [tour, kind]);
}

export function TakeTourButton() {
  const start = useStartTour();
  return (
    <Button variant="outline" size="sm" onClick={start}>
      <CompassIcon />
      Take the tour
    </Button>
  );
}
