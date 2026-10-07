import localFont from "next/font/local";
import { cn } from "@/lib/utils";

// Every font is a local file from @fontsource (latin subset), never next/font/google:
// Turbopack intermittently fails the build on the CSS Google serves for a font ("next/font/
// google queries have exactly one entry"), on CI and on Vercel, and a local file needs no
// network at build time. Same weights and CSS variables as the kit's next/font/google setup,
// so its font picker (app/themes.css) is unchanged. next/font/local only accepts literal
// options, hence one call per font. Variable fonts (Inter, Geist, DM Sans) use the
// @fontsource-variable file with their full weight range.

/** The default UI font (the kit's DM Sans), --font-sans. */
export const dmSans = localFont({
  src: "../node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2",
  weight: "100 1000",
  variable: "--font-sans"
});

const inter = localFont({
  src: "../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-inter"
});

const geist = localFont({
  src: "../node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-geist"
});

const roboto = localFont({
  src: [
    { path: "../node_modules/@fontsource/roboto/files/roboto-latin-400-normal.woff2", weight: "400" },
    { path: "../node_modules/@fontsource/roboto/files/roboto-latin-500-normal.woff2", weight: "500" },
    { path: "../node_modules/@fontsource/roboto/files/roboto-latin-700-normal.woff2", weight: "700" }
  ],
  variable: "--font-roboto"
});

const plus_jakarta_sans = localFont({
  src: [
    { path: "../node_modules/@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-400-normal.woff2", weight: "400" },
    { path: "../node_modules/@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-500-normal.woff2", weight: "500" },
    { path: "../node_modules/@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-600-normal.woff2", weight: "600" },
    { path: "../node_modules/@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-800-normal.woff2", weight: "800" }
  ],
  variable: "--font-plus-jakarta-sans"
});

const montserrat = localFont({
  src: [
    { path: "../node_modules/@fontsource/montserrat/files/montserrat-latin-400-normal.woff2", weight: "400" },
    { path: "../node_modules/@fontsource/montserrat/files/montserrat-latin-500-normal.woff2", weight: "500" },
    { path: "../node_modules/@fontsource/montserrat/files/montserrat-latin-600-normal.woff2", weight: "600" }
  ],
  variable: "--font-montserrat"
});

const poppins = localFont({
  src: [
    { path: "../node_modules/@fontsource/poppins/files/poppins-latin-400-normal.woff2", weight: "400" },
    { path: "../node_modules/@fontsource/poppins/files/poppins-latin-500-normal.woff2", weight: "500" },
    { path: "../node_modules/@fontsource/poppins/files/poppins-latin-600-normal.woff2", weight: "600" }
  ],
  variable: "--font-poppins"
});

const overpass_mono = localFont({
  src: [
    { path: "../node_modules/@fontsource/overpass-mono/files/overpass-mono-latin-400-normal.woff2", weight: "400" },
    { path: "../node_modules/@fontsource/overpass-mono/files/overpass-mono-latin-500-normal.woff2", weight: "500" },
    { path: "../node_modules/@fontsource/overpass-mono/files/overpass-mono-latin-700-normal.woff2", weight: "700" }
  ],
  variable: "--font-overpass-mono"
});

const ptSans = localFont({
  src: [
    { path: "../node_modules/@fontsource/pt-sans/files/pt-sans-latin-400-normal.woff2", weight: "400" },
    { path: "../node_modules/@fontsource/pt-sans/files/pt-sans-latin-700-normal.woff2", weight: "700" }
  ],
  variable: "--font-pt-sans"
});

const hedvig_letters_serif = localFont({
  src: "../node_modules/@fontsource/hedvig-letters-serif/files/hedvig-letters-serif-latin-400-normal.woff2",
  weight: "400",
  variable: "--font-hedvig-letters-serif"
});

const kumbh_sans = localFont({
  src: "../node_modules/@fontsource/kumbh-sans/files/kumbh-sans-latin-400-normal.woff2",
  weight: "400",
  variable: "--font-kumbh-sans"
});

const outfit = localFont({
  src: "../node_modules/@fontsource/outfit/files/outfit-latin-400-normal.woff2",
  weight: "400",
  variable: "--font-outfit"
});

export const fontVariables = cn(
  geist.variable,
  inter.variable,
  roboto.variable,
  montserrat.variable,
  poppins.variable,
  overpass_mono.variable,
  ptSans.variable,
  plus_jakarta_sans.variable,
  hedvig_letters_serif.variable,
  kumbh_sans.variable,
  outfit.variable
);
