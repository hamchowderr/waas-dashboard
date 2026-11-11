import React from "react";
import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { ThemeProvider } from "next-themes";

import "./globals.css";
import "./looks.css";

import { cn } from "@/lib/utils";
import { uiSans, fontVariables } from "@/lib/fonts";
import { AppearanceProvider } from "@/components/appearance-provider";
import { appearanceLetterSpacing, appearanceVars, readAppearance } from "@/lib/appearance";
import { Toaster } from "@/components/ui/sonner";
import { LOOK_COOKIE, readLook } from "@/lib/looks";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: { default: "AnyPress", template: "%s · AnyPress" },
  description: "Operations dashboard for the WaaS provisioning API.",
  robots: { index: false, follow: false },
  // Installed on a phone's home screen, it opens in its own window (app/manifest.ts).
  appleWebApp: { capable: true, title: "AnyPress", statusBarStyle: "default" }
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#141210" }
  ]
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const appearance = readAppearance((name) => cookieStore.get(name)?.value);
  const bodyStyle = {
    ...appearanceVars(appearance),
    letterSpacing: appearanceLetterSpacing(appearance)
  } as React.CSSProperties;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("font-sans", uiSans.variable)}
      data-look={readLook(cookieStore.get(LOOK_COOKIE)?.value)}>
      <body
        suppressHydrationWarning
        className={cn("bg-background group/layout font-sans", fontVariables)}
        style={bodyStyle}
        data-theme-content-layout={appearance.layout}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AppearanceProvider initial={appearance}>
            <TooltipProvider>
              {children}
              <Toaster position="top-center" richColors />
            </TooltipProvider>
          </AppearanceProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
