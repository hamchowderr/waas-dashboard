// A seller's or reseller's own look in the dashboard: the colors its main color sets, and the
// limits the Branding page checks before an upload.

import type { BrandImage } from "@/lib/api/types";

/** The largest logo and icon the API takes. */
export const BRAND_IMAGE_LIMITS: Record<BrandImage, number> = { logo: 256 * 1024, icon: 64 * 1024 };

export const BRAND_IMAGE_TYPES: Record<BrandImage, string[]> = {
  logo: ["image/png", "image/jpeg", "image/webp"],
  icon: ["image/png", "image/jpeg", "image/webp", "image/x-icon", "image/vnd.microsoft.icon"]
};

const HEX = /^#[0-9a-f]{6}$/i;

/** WCAG relative luminance of a #rrggbb color. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

/** White or near-black, whichever reads better on the color. */
export function foregroundFor(hex: string): string {
  const l = luminance(hex);
  return (1.05 / (l + 0.05) >= (l + 0.05) / 0.05) ? "#ffffff" : "#0a0a0a";
}

/** The CSS variables a brand's main color sets, the way an Appearance accent does. None for no color. */
export function brandColorVars(color: string | null | undefined): Record<string, string> {
  if (!color || !HEX.test(color)) return {};
  const fg = foregroundFor(color);
  return {
    "--primary": color,
    "--primary-foreground": fg,
    "--ring": color,
    "--sidebar-primary": color,
    "--sidebar-primary-foreground": fg,
    "--sidebar-accent": `color-mix(in oklab, ${color} 15%, transparent)`,
    "--sidebar-accent-foreground": "var(--foreground)",
    "--sidebar-ring": color
  };
}
