// Preview-only: the three looks being compared for the dashboard redesign (waas-api-0xzo).
// A look is a data-look attribute on <body>; app/looks.css holds what each one changes.
// Picked with the switcher at the bottom of a sample-data preview, or ?look=<value> in the address.

export const LOOK_COOKIE = "dashboard_look";

export const LOOKS = [
  { value: "sketch", number: 1, label: "Sketchbook", note: "The anypress.io look: ink outlines, warm paper, honey highlights" },
  { value: "console", number: 2, label: "Console", note: "Dark sidebar, open page, no boxes: sections and big numbers" },
  { value: "studio", number: 3, label: "Studio", note: "Soft floating panels on a warm canvas, rounder and friendlier" }
] as const;

export type Look = (typeof LOOKS)[number]["value"];

export function readLook(value: string | undefined): Look | null {
  return LOOKS.find((l) => l.value === value)?.value ?? null;
}
