"use client";

// Tour by Hin (https://onboarding-tour.vercel.app, shadcn registry item @tour/tour), adapted to this kit's radix-ui
// package. Changed from the original: a step whose element isn't on screen (a sidebar link on a phone, say) shows
// its card in the middle of the page instead of nothing, so the tour can't get stuck invisible.

import * as React from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { XIcon } from "lucide-react";
import type { Popover as PopoverPrimitive } from "radix-ui";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";

type ContentProps = React.ComponentProps<typeof PopoverPrimitive.Content>;

const TourContext = React.createContext<{ start: (tourId: string) => void; close: () => void } | null>(null);

function useTour() {
  const context = React.useContext(TourContext);
  if (!context) throw new Error("useTour must be used within a TourProvider");
  return context;
}

interface Step {
  /** Matches the data-tour-step-id of the element to highlight. */
  id: string;
  title: React.ReactNode;
  content: React.ReactNode;
  nextRoute?: string;
  previousRoute?: string;
  nextLabel?: React.ReactNode;
  previousLabel?: React.ReactNode;
  side?: ContentProps["side"];
  sideOffset?: ContentProps["sideOffset"];
  align?: ContentProps["align"];
  alignOffset?: ContentProps["alignOffset"];
  className?: string;
}

interface Tour {
  id: string;
  steps: Step[];
}

function TourProvider({ tours, children }: { tours: Tour[]; children: React.ReactNode }) {
  const [activeTourId, setActiveTourId] = React.useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = React.useState(0);

  const steps = tours.find((tour) => tour.id === activeTourId)?.steps ?? [];

  const close = React.useCallback(() => {
    setActiveTourId(null);
    setCurrentStepIndex(0);
  }, []);

  const start = React.useCallback(
    (tourId: string) => {
      const tour = tours.find((tour) => tour.id === tourId);
      if (!tour || tour.steps.length === 0) return;
      setActiveTourId(tourId);
      setCurrentStepIndex(0);
    },
    [tours]
  );

  function next() {
    if (currentStepIndex < steps.length - 1) setCurrentStepIndex((prev) => prev + 1);
    else close();
  }

  function previous() {
    if (currentStepIndex > 0) setCurrentStepIndex((prev) => prev - 1);
  }

  const value = React.useMemo(() => ({ start, close }), [start, close]);

  return (
    <TourContext.Provider value={value}>
      {children}
      {steps.length > 0 && (
        <TourOverlay
          step={steps[currentStepIndex]}
          currentStepIndex={currentStepIndex}
          totalSteps={steps.length}
          onNext={next}
          onPrevious={previous}
          onClose={close}
        />
      )}
    </TourContext.Provider>
  );
}

type Target = { rect: DOMRect; radius: number };

function TourOverlay({
  step,
  currentStepIndex,
  totalSteps,
  onNext,
  onPrevious,
  onClose
}: {
  step: Step;
  currentStepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
}) {
  const [targets, setTargets] = React.useState<Target[]>([]);

  React.useEffect(() => {
    let needsScroll = true;

    function updatePosition() {
      const found: (Target & { element: Element })[] = [];
      document.querySelectorAll(`[data-tour-step-id~='${step.id}']`).forEach((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;
        const radius = parseFloat(window.getComputedStyle(element).borderRadius) || 4;
        found.push({ rect, radius, element });
      });
      setTargets(found.map(({ rect, radius }) => ({ rect, radius })));
      if (found.length > 0 && needsScroll) {
        // A tall element (a long card on a phone) goes to the top, leaving room for the tour card.
        const tall = found[0].rect.height > window.innerHeight / 2;
        found[0].element.scrollIntoView({ behavior: "smooth", block: tall ? "start" : "center" });
        needsScroll = false;
      }
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    const observer = new MutationObserver(updatePosition);
    observer.observe(document.body, { attributes: true, childList: true, subtree: true });
    const resizeObserver = new ResizeObserver(updatePosition);
    resizeObserver.observe(document.body);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      observer.disconnect();
      resizeObserver.disconnect();
    };
  }, [step]);

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Nothing to point at: anchor the card to the middle of the window. An element too tall to fit beside the card:
  // anchor to its visible top, so the card sits over it instead of off the screen.
  const target = targets[0]?.rect;
  const anchor = !target
    ? new DOMRect(window.innerWidth / 2, window.innerHeight / 3, 0, 0)
    : target.height > window.innerHeight / 2
      ? new DOMRect(target.left, Math.max(target.top, 0) + 48, target.width, 0)
      : target;
  const last = currentStepIndex === totalSteps - 1;
  const nextLabel = step.nextLabel ?? (last ? "Finish" : "Next");
  const previousLabel = step.previousLabel ?? "Back";

  return createPortal(
    <div className="fixed inset-0 z-[60]">
      <svg className="absolute inset-0 size-full" aria-hidden>
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targets.map((target, i) => (
              <rect key={i} x={target.rect.left} y={target.rect.top} width={target.rect.width} height={target.rect.height} rx={target.radius} fill="black" />
            ))}
          </mask>
        </defs>
        <rect width="100%" height="100%" mask="url(#tour-mask)" className="fill-black opacity-30" />
        {targets.map((target, i) => (
          <rect
            key={i}
            x={target.rect.left}
            y={target.rect.top}
            width={target.rect.width}
            height={target.rect.height}
            rx={target.radius}
            className="stroke-primary fill-none stroke-2"
          />
        ))}
      </svg>
      <Popover key={step.id} open>
        <PopoverAnchor virtualRef={{ current: { getBoundingClientRect: () => anchor } }} />
        <PopoverContent
          className={cn("z-[61] w-80 px-0", step.className)}
          side={targets.length ? step.side : "bottom"}
          sideOffset={step.sideOffset ?? 8}
          align={targets.length ? step.align : "center"}
          alignOffset={step.alignOffset}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          asChild>
          <Card role="dialog" aria-label={typeof step.title === "string" ? step.title : "Tour"}>
            <CardHeader>
              <CardTitle>{step.title}</CardTitle>
              <CardDescription>
                Step {currentStepIndex + 1} of {totalSteps}
              </CardDescription>
              <CardAction>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <XIcon />
                  <span className="sr-only">Close the tour</span>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="text-sm">{step.content}</CardContent>
            <CardFooter className="justify-between gap-2">
              {currentStepIndex > 0 &&
                (step.previousRoute ? (
                  <Button variant="outline" onClick={onPrevious} asChild>
                    <Link href={step.previousRoute}>{previousLabel}</Link>
                  </Button>
                ) : (
                  <Button variant="outline" onClick={onPrevious}>
                    {previousLabel}
                  </Button>
                ))}
              {step.nextRoute ? (
                <Button className="ms-auto" onClick={onNext} asChild>
                  <Link href={step.nextRoute}>{nextLabel}</Link>
                </Button>
              ) : (
                <Button className="ms-auto" onClick={onNext}>
                  {nextLabel}
                </Button>
              )}
            </CardFooter>
          </Card>
        </PopoverContent>
      </Popover>
    </div>,
    document.body
  );
}

export { TourProvider, useTour, type Step, type Tour };
