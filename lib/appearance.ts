// The dashboard's appearance settings: what the Appearance panel changes, how a choice is
// remembered (one cookie per setting, so the server renders the right look on first paint),
// and the CSS variables each choice sets on <body>.

/** Tailwind palette hues offered as accent and chart colors, in hue order. */
export const PALETTE = [
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose"
] as const;

/** UI fonts. Each value names a --font-* variable from lib/fonts.ts. */
export const UI_FONTS = [
  { value: "inter", label: "Inter" },
  { value: "roboto", label: "Roboto" },
  { value: "poppins", label: "Poppins" },
  { value: "montserrat", label: "Montserrat" },
  { value: "pt-sans", label: "PT Sans" },
  { value: "overpass-mono", label: "Overpass Mono" }
] as const;

/** Heading fonts, used for page titles and big numbers (the .font-display utility). */
export const HEADING_FONTS = [
  { value: "geist", label: "Geist" },
  { value: "montserrat", label: "Montserrat" },
  { value: "poppins", label: "Poppins" },
  { value: "plus-jakarta-sans", label: "Plus Jakarta Sans" },
  { value: "outfit", label: "Outfit" },
  { value: "kumbh-sans", label: "Kumbh Sans" },
  { value: "hedvig-letters-serif", label: "Hedvig Letters Serif" }
] as const;

export const RADII = { none: "0rem", sm: "0.3rem", md: "0.5rem", lg: "1rem", xl: "1.5rem" } as const;

/** Type and spacing steps for the "smaller" and "larger" scales. */
const SCALES = {
  sm: { "--text-lg": "1.05rem", "--text-base": "0.85rem", "--text-sm": "0.75rem", "--spacing": "0.222222rem" },
  lg: { "--text-lg": "1.55rem", "--text-base": "1.35rem", "--text-sm": "1rem", "--spacing": "0.262222rem" }
} as const;

export const SIDEBAR_STYLES = ["inset", "sidebar", "floating"] as const;
export const SIDEBAR_COLLAPSE = ["icon", "offcanvas"] as const;

export type Hue = (typeof PALETTE)[number];
export type Appearance = {
  accent: Hue | "default";
  chart: Hue | "default";
  font: (typeof UI_FONTS)[number]["value"] | "default";
  headingFont: (typeof HEADING_FONTS)[number]["value"] | "default";
  radius: keyof typeof RADII | "default";
  scale: keyof typeof SCALES | "default";
  layout: "full" | "centered";
  sidebarStyle: (typeof SIDEBAR_STYLES)[number];
  sidebarCollapse: (typeof SIDEBAR_COLLAPSE)[number];
};

export const DEFAULT_APPEARANCE: Appearance = {
  accent: "default",
  chart: "default",
  font: "default",
  headingFont: "default",
  radius: "default",
  scale: "default",
  layout: "full",
  sidebarStyle: "inset",
  sidebarCollapse: "icon"
};

/** Cookie per setting. Names kept from the earlier theme panel so saved choices carry over. */
const COOKIES: Record<keyof Appearance, string> = {
  accent: "theme_color",
  chart: "theme_chart_preset",
  font: "theme_font",
  headingFont: "theme_display_font",
  radius: "theme_radius",
  scale: "theme_scale",
  layout: "theme_content_layout",
  sidebarStyle: "theme_sidebar_variant",
  sidebarCollapse: "theme_sidebar_collapsible"
};

const ALLOWED: Record<keyof Appearance, readonly string[]> = {
  accent: ["default", ...PALETTE],
  chart: ["default", ...PALETTE],
  font: ["default", ...UI_FONTS.map((f) => f.value)],
  headingFont: ["default", ...HEADING_FONTS.map((f) => f.value)],
  radius: ["default", ...Object.keys(RADII)],
  scale: ["default", ...Object.keys(SCALES)],
  layout: ["full", "centered"],
  sidebarStyle: SIDEBAR_STYLES,
  sidebarCollapse: SIDEBAR_COLLAPSE
};

/** Reads the saved settings, ignoring anything unknown (an old or hand-edited cookie). */
export function readAppearance(getCookie: (name: string) => string | undefined): Appearance {
  const result = { ...DEFAULT_APPEARANCE };
  for (const key of Object.keys(COOKIES) as (keyof Appearance)[]) {
    const saved = getCookie(COOKIES[key]);
    if (saved && ALLOWED[key].includes(saved)) (result as Record<string, string>)[key] = saved;
  }
  return result;
}

/** Saves every setting; one that is back at its default clears its cookie. */
export function saveAppearance(appearance: Appearance) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  for (const key of Object.keys(COOKIES) as (keyof Appearance)[]) {
    const value = appearance[key];
    const age = value === DEFAULT_APPEARANCE[key] ? 0 : 31536000;
    document.cookie = `${COOKIES[key]}=${age ? value : ""}; path=/; max-age=${age}; SameSite=Lax${secure}`;
  }
}

/** The CSS variables a set of choices puts on <body>. The default look sets none. */
export function appearanceVars(appearance: Appearance): Record<string, string> {
  const vars: Record<string, string> = {};
  const { accent, chart, font, headingFont, radius, scale } = appearance;
  if (accent !== "default") {
    const color = `var(--color-${accent}-600)`;
    Object.assign(vars, {
      "--primary": color,
      "--primary-foreground": "var(--color-white)",
      "--ring": color,
      "--sidebar-primary": color,
      "--sidebar-primary-foreground": "var(--color-white)",
      "--sidebar-accent": `color-mix(in oklab, ${color} 15%, transparent)`,
      "--sidebar-accent-foreground": "var(--foreground)",
      "--sidebar-ring": color
    });
  }
  if (chart !== "default") {
    [600, 500, 400, 300, 200].forEach((shade, i) => (vars[`--chart-${i + 1}`] = `var(--color-${chart}-${shade})`));
  }
  if (font !== "default") vars["--font-sans"] = `var(--font-${font})`;
  if (headingFont !== "default") vars["--display-family"] = `var(--font-${headingFont})`;
  if (radius !== "default") vars["--radius"] = RADII[radius];
  if (scale !== "default") Object.assign(vars, SCALES[scale]);
  return vars;
}

/** Overpass Mono runs wide, so it gets tighter letter spacing. */
export function appearanceLetterSpacing(appearance: Appearance) {
  return appearance.font === "overpass-mono" ? "-0.05em" : undefined;
}
