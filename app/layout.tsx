import React from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ThemeProvider } from "next-themes";

import "./globals.css";

import { cn } from "@/lib/utils";
import { dmSans, fontVariables } from "@/lib/fonts";
import { ActiveThemeProvider } from "@/components/active-theme";
import { DEFAULT_THEME, type ThemeType } from "@/lib/themes";
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
  const themeSettings: ThemeType = {
    preset: (cookieStore.get("theme_preset")?.value ?? DEFAULT_THEME.preset),
    color: (cookieStore.get("theme_color")?.value ?? DEFAULT_THEME.color),
    chartPreset: (cookieStore.get("theme_chart_preset")?.value ?? DEFAULT_THEME.chartPreset),
    scale: (cookieStore.get("theme_scale")?.value ?? DEFAULT_THEME.scale),
    radius: (cookieStore.get("theme_radius")?.value ?? DEFAULT_THEME.radius),
    contentLayout: (cookieStore.get("theme_content_layout")?.value ??
      DEFAULT_THEME.contentLayout),
    sidebarVariant: (cookieStore.get("theme_sidebar_variant")?.value ??
      DEFAULT_THEME.sidebarVariant),
    sidebarCollapsible: (cookieStore.get("theme_sidebar_collapsible")?.value ??
      DEFAULT_THEME.sidebarCollapsible),
    font: (cookieStore.get("theme_font")?.value ?? DEFAULT_THEME.font),
    displayFont: (cookieStore.get("theme_display_font")?.value ??
      DEFAULT_THEME.displayFont)
  };

  const bodyAttributes = Object.fromEntries(
    Object.entries(themeSettings)
      .filter(([, value]) => value)
      .map(([key, value]) => [`data-theme-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`, value])
  );

  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", dmSans.variable)}>
      <body
        suppressHydrationWarning
        className={cn("bg-background group/layout font-sans", fontVariables)}
        {...bodyAttributes}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <ActiveThemeProvider initialTheme={themeSettings}>
            <TooltipProvider>
              {children}
              <Toaster position="top-center" richColors />
            </TooltipProvider>
          </ActiveThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
