import React from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ThemeProvider } from "next-themes";

import "./globals.css";
import "./looks.css";

import { cn } from "@/lib/utils";
import { dmSans, fontVariables } from "@/lib/fonts";
import { AppearanceProvider } from "@/components/appearance-provider";
import { appearanceLetterSpacing, appearanceVars, readAppearance } from "@/lib/appearance";
import { LOOK_COOKIE, readLook } from "@/lib/looks";
import { LookSwitcher } from "@/components/shell/look-switcher";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: { default: "AnyPress", template: "%s · AnyPress" },
  description: "Operations dashboard for the WaaS provisioning API.",
  robots: { index: false, follow: false }
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const appearance = readAppearance((name) => cookieStore.get(name)?.value);
  // Preview-only redesign looks, on sample data (lib/looks.ts).
  const sample = process.env.WAAS_API_FIXTURES === "1";
  const look = sample ? readLook(cookieStore.get(LOOK_COOKIE)?.value) : null;
  const bodyStyle = {
    ...appearanceVars(appearance),
    letterSpacing: appearanceLetterSpacing(appearance)
  } as React.CSSProperties;

  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", dmSans.variable)}>
      <body
        suppressHydrationWarning
        className={cn("bg-background group/layout font-sans", fontVariables)}
        style={bodyStyle}
        data-theme-content-layout={appearance.layout}
        data-look={look ?? undefined}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AppearanceProvider initial={appearance}>
            <TooltipProvider>
              {children}
              {sample && <LookSwitcher current={look} />}
              <Toaster position="top-center" richColors />
            </TooltipProvider>
          </AppearanceProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
