"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { MoonIcon, PaletteIcon, RotateCcwIcon, ShuffleIcon, SunIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  type Appearance,
  DEFAULT_APPEARANCE,
  HEADING_FONTS,
  type Hue,
  PALETTE,
  SIDEBAR_STYLES,
  UI_FONTS
} from "@/lib/appearance";
import { useAppearance } from "@/components/appearance-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { useSidebar } from "@/components/ui/sidebar";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** The palette button in the header and the panel it opens. */
export function AppearancePanel() {
  const { appearance, setAppearance } = useAppearance();
  const { theme: mode, setTheme: setMode } = useTheme();
  const { state, setOpen } = useSidebar();
  const set = <K extends keyof Appearance>(key: K, value: Appearance[K]) => setAppearance({ ...appearance, [key]: value });

  const shuffle = () => {
    const pick = <T,>(options: readonly T[]) => options[Math.floor(Math.random() * options.length)];
    // Charts take the accent or a hue next to it, so the two always sit well together.
    const accent = Math.floor(Math.random() * PALETTE.length);
    const chart = (accent + pick([-2, -1, 0, 0, 1, 2]) + PALETTE.length) % PALETTE.length;
    setAppearance({
      ...appearance,
      accent: PALETTE[accent],
      chart: PALETTE[chart],
      font: pick(UI_FONTS).value,
      headingFont: pick(HEADING_FONTS).value,
      radius: pick(["none", "sm", "md", "lg", "xl"] as const),
      scale: pick(["default", "sm", "lg"] as const),
      layout: pick(["full", "centered"] as const),
      sidebarStyle: pick(SIDEBAR_STYLES)
    });
  };

  const reset = () => {
    setAppearance(DEFAULT_APPEARANCE);
    setMode("light");
    setOpen(true);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="icon-sm" variant="ghost">
          <PaletteIcon />
          <span className="sr-only">Appearance</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-80 gap-0 sm:max-w-80">
        <SheetHeader className="border-b">
          <SheetTitle>Appearance</SheetTitle>
          <SheetDescription>Saved in this browser only.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-6 overflow-y-auto px-4 py-5">
          <Field label="Mode">
            <Choice
              value={mode === "dark" ? "dark" : "light"}
              onChange={setMode}
              options={[
                { value: "light", label: "Light", icon: <SunIcon /> },
                { value: "dark", label: "Dark", icon: <MoonIcon /> }
              ]}
            />
          </Field>
          <Field label="Accent color">
            <Swatches value={appearance.accent} onChange={(v) => set("accent", v)} />
          </Field>
          <Field label="Chart colors">
            <Swatches value={appearance.chart} onChange={(v) => set("chart", v)} />
          </Field>
          <Field label="Font">
            <FontSelect value={appearance.font} fonts={UI_FONTS} onChange={(v) => set("font", v)} />
          </Field>
          <Field label="Heading font">
            <FontSelect value={appearance.headingFont} fonts={HEADING_FONTS} onChange={(v) => set("headingFont", v)} />
          </Field>
          <Field label="Corner radius">
            <Choice
              value={appearance.radius}
              onChange={(v) => set("radius", v)}
              options={[
                { value: "default", label: "Default" },
                { value: "none", label: "0" },
                { value: "sm", label: "S" },
                { value: "md", label: "M" },
                { value: "lg", label: "L" },
                { value: "xl", label: "XL" }
              ]}
            />
          </Field>
          <Field label="Text size">
            <Choice
              value={appearance.scale}
              onChange={(v) => set("scale", v)}
              options={[
                { value: "sm", label: "Smaller" },
                { value: "default", label: "Default" },
                { value: "lg", label: "Larger" }
              ]}
            />
          </Field>
          <Field label="Page width">
            <Choice
              value={appearance.layout}
              onChange={(v) => set("layout", v)}
              options={[
                { value: "full", label: "Full" },
                { value: "centered", label: "Centered" }
              ]}
            />
          </Field>
          <Field label="Sidebar" className="max-lg:hidden">
            <Choice
              value={appearance.sidebarStyle}
              onChange={(v) => set("sidebarStyle", v)}
              options={[
                { value: "inset", label: "Inset" },
                { value: "sidebar", label: "Flush" },
                { value: "floating", label: "Floating" }
              ]}
            />
            <Choice
              value={state === "collapsed" ? appearance.sidebarCollapse : "expanded"}
              onChange={(v) => {
                if (v === "expanded") return setOpen(true);
                set("sidebarCollapse", v);
                setOpen(false);
              }}
              options={[
                { value: "expanded", label: "Open" },
                { value: "icon", label: "Icons" },
                { value: "offcanvas", label: "Hidden" }
              ]}
            />
          </Field>
        </div>
        <SheetFooter className="flex-row border-t">
          <Button variant="outline" className="flex-1" onClick={shuffle}>
            <ShuffleIcon /> Shuffle
          </Button>
          <Button className="flex-1" onClick={reset}>
            <RotateCcwIcon /> Reset
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <Label className="text-muted-foreground text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}

function Choice<T extends string>({
  value,
  onChange,
  options
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon?: React.ReactNode }[];
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      className="w-full"
      value={value}
      onValueChange={(next) => next && onChange(next as T)}>
      {options.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value} className="grow">
          {option.icon}
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/** Default (the neutral look) plus every palette hue, as round swatches. */
function Swatches({ value, onChange }: { value: Hue | "default"; onChange: (value: Hue | "default") => void }) {
  return (
    <div role="radiogroup" className="grid grid-cols-9 gap-1.5">
      {(["default", ...PALETTE] as const).map((hue) => (
        <Tooltip key={hue}>
          <TooltipTrigger asChild>
            <button
              type="button"
              role="radio"
              aria-checked={value === hue}
              aria-label={hue === "default" ? "Default" : hue}
              onClick={() => onChange(hue)}
              className={cn(
                "ring-offset-background focus-visible:ring-ring size-6 rounded-full transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                value === hue && "ring-foreground ring-2 ring-offset-2"
              )}
              style={{ background: hue === "default" ? "oklch(0.205 0 0)" : `var(--color-${hue}-600)` }}
            />
          </TooltipTrigger>
          <TooltipContent className="capitalize">{hue}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

function FontSelect<T extends string>({
  value,
  fonts,
  onChange
}: {
  value: T | "default";
  fonts: readonly { value: T; label: string }[];
  onChange: (value: T | "default") => void;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as T | "default")}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="default">Default</SelectItem>
        {fonts.map((font) => (
          <SelectItem key={font.value} value={font.value} style={{ fontFamily: `var(--font-${font.value})` }}>
            {font.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
