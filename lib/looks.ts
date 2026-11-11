/**
 * Style directions to compare on sample data only (WAAS_API_FIXTURES=1). The live dashboard never
 * reads the cookie, so it always shows the current look. app/looks.css holds each direction.
 */
export const LOOKS = [
  { id: "current", label: "Current" },
  { id: "flat", label: "1 Flat" },
  { id: "panels", label: "2 Panels" },
  { id: "document", label: "3 Document" },
  { id: "tone", label: "4 Tone" },
  { id: "square", label: "5 Square" },
  { id: "shaded", label: "6 Shaded" }
] as const;

export type Look = (typeof LOOKS)[number]["id"];

export const LOOK_COOKIE = "dashboard_look";

export function readLook(value: string | undefined): Look | undefined {
  if (process.env.WAAS_API_FIXTURES !== "1") return undefined;
  return LOOKS.find((l) => l.id === value && l.id !== "current")?.id;
}
