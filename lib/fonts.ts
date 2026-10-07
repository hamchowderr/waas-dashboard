import {
  Geist,
  Inter,
  Montserrat,
  Poppins,
  Roboto,
  PT_Sans,
  Plus_Jakarta_Sans,
  Hedvig_Letters_Serif,
  Kumbh_Sans,
  Outfit
} from "next/font/google";
import localFont from "next/font/local";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto"
});

const plus_jakarta_sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "800"],
  variable: "--font-plus-jakarta-sans"
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-montserrat"
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-poppins"
});

// Overpass Mono loads from @fontsource rather than next/font/google: Turbopack fails the
// build on the Google CSS some networks get for it ("next/font/google queries have exactly
// one entry"), which broke CI. Same weights and CSS variable as the other fonts.
const overpass_mono = localFont({
  src: [
    { path: "../node_modules/@fontsource/overpass-mono/files/overpass-mono-latin-400-normal.woff2", weight: "400" },
    { path: "../node_modules/@fontsource/overpass-mono/files/overpass-mono-latin-500-normal.woff2", weight: "500" },
    { path: "../node_modules/@fontsource/overpass-mono/files/overpass-mono-latin-700-normal.woff2", weight: "700" }
  ],
  variable: "--font-overpass-mono"
});

const ptSans = PT_Sans({
  variable: "--font-pt-sans",
  subsets: ["latin"],
  weight: ["400", "700"]
});

const hedvig_letters_serif = Hedvig_Letters_Serif({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-hedvig-letters-serif"
});

const kumbh_sans = Kumbh_Sans({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-kumbh-sans"
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400"],
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
