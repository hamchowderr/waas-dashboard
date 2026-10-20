"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { ResellerSettings } from "@/lib/api/types";
import { updateReseller } from "../../actions";
import { ResellerFields, resellerFormReady, toForm, toSettings } from "../reseller-fields";

/** The reseller's name, limits, wholesale discount and billing email. Lowering a limit removes nothing. */
export function ResellerSettingsForm({ id, settings }: { id: string; settings: ResellerSettings }) {
  const [form, setForm] = React.useState(() => toForm(settings));
  const [pending, startTransition] = React.useTransition();
  const changed = JSON.stringify(toForm(settings)) !== JSON.stringify(form);

  const save = () =>
    startTransition(async () => {
      const result = await updateReseller(id, toSettings(form));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setForm(toForm(result.data));
      toast.success("Saved");
    });

  return (
    <div className="space-y-4">
      <ResellerFields value={form} onChange={setForm} idPrefix="reseller" />
      <Button size="sm" disabled={!changed || !resellerFormReady(form) || pending} onClick={save}>
        {pending && <Spinner />}
        Save
      </Button>
    </div>
  );
}
