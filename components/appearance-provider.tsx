"use client";

import * as React from "react";

import {
  type Appearance,
  appearanceLetterSpacing,
  appearanceVars,
  DEFAULT_APPEARANCE,
  saveAppearance
} from "@/lib/appearance";

type AppearanceContext = { appearance: Appearance; setAppearance: (next: Appearance) => void };

const Context = React.createContext<AppearanceContext | null>(null);

/**
 * Holds the Appearance panel's settings. The server already rendered <body> with the
 * saved settings (see app/layout.tsx); this keeps <body> and the cookies in step when
 * they change.
 */
export function AppearanceProvider({ initial, children }: { initial: Appearance; children: React.ReactNode }) {
  const [appearance, setState] = React.useState(initial);
  const applied = React.useRef<string[]>(Object.keys(appearanceVars(initial)));

  const setAppearance = React.useCallback((next: Appearance) => {
    setState(next);
    saveAppearance(next);
    const body = document.body;
    const vars = appearanceVars(next);
    for (const name of applied.current) if (!(name in vars)) body.style.removeProperty(name);
    for (const [name, value] of Object.entries(vars)) body.style.setProperty(name, value);
    applied.current = Object.keys(vars);
    body.style.letterSpacing = appearanceLetterSpacing(next) ?? "";
    body.dataset.themeContentLayout = next.layout;
  }, []);

  const value = React.useMemo(() => ({ appearance, setAppearance }), [appearance, setAppearance]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAppearance() {
  const context = React.useContext(Context);
  if (!context) throw new Error("useAppearance needs an AppearanceProvider above it.");
  return context;
}

export { DEFAULT_APPEARANCE };
