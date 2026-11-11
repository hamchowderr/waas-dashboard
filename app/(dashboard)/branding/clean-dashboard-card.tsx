"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboardIcon } from "lucide-react";
import { toast } from "sonner";

import { Card, CardDescription, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { setCleanDashboard } from "../actions";

/**
 * The wp-admin Dashboard of the storefront's stores: their own home (links to edit the site, what comes with its
 * site type, the plan) instead of WordPress's Welcome, Site Health, Quick Draft, At a Glance, Activity and News boxes.
 */
export function CleanDashboardCard({ productId, initial, canEdit }: { productId: string; initial: boolean; canEdit: boolean }) {
  const router = useRouter();
  const [on, setOn] = React.useState(initial);
  const [pending, startTransition] = React.useTransition();
  const toggle = (next: boolean) =>
    startTransition(async () => {
      const result = await setCleanDashboard(productId, next);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setOn(next);
      toast.success(next ? "Your stores show their own Dashboard home" : "Your stores show WordPress's usual Dashboard");
      router.refresh();
    });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutDashboardIcon className="text-primary size-4" />
          Clean WordPress Dashboard
        </CardTitle>
        <CardDescription>
          On your stores, wp-admin opens on a simple home: links to edit the site, what comes with it and its plan, instead of
          WordPress&apos;s Welcome, Site Health, Quick Draft, At a Glance, Activity and News boxes. Changes reach your stores
          within a minute, without restarting them.
        </CardDescription>
        <CardAction>
          <Switch checked={on} disabled={pending || !canEdit} onCheckedChange={toggle} aria-label="Clean WordPress Dashboard on your stores" />
        </CardAction>
      </CardHeader>
    </Card>
  );
}
