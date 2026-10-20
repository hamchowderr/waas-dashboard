"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

/** Reloads the list every 15 seconds while a client is still being set up, so their status moves on its own. */
export function RefreshWhileSettingUp({ active }: { active: boolean }) {
  const router = useRouter();
  React.useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => router.refresh(), 15_000);
    return () => clearInterval(timer);
  }, [active, router]);
  return null;
}
