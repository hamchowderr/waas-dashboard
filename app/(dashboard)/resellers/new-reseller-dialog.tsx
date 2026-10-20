"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { createReseller } from "../actions";
import { EMPTY_RESELLER, ResellerFields, resellerFormReady, toSettings } from "./reseller-fields";

/** "New reseller": the account, with any storefronts of their own moved into it at once. */
export function NewResellerButton({ storefronts }: { storefronts: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY_RESELLER);
  const [chosen, setChosen] = React.useState<string[]>([]);
  const [pending, startTransition] = React.useTransition();

  const submit = () =>
    startTransition(async () => {
      const result = await createReseller(toSettings(form), chosen);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      setForm(EMPTY_RESELLER);
      setChosen([]);
      router.push(`/resellers/${result.data.id}`);
    });

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusIcon /> New reseller
      </Button>
      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New reseller</DialogTitle>
            <DialogDescription>
              A partner that sells stores from its own storefronts and pays a wholesale price for each live store. Its storefronts keep
              their keys, team and stores.
            </DialogDescription>
          </DialogHeader>
          <ResellerFields value={form} onChange={setForm} idPrefix="new-reseller" />
          {storefronts.length > 0 && (
            <div className="space-y-2">
              <Label>Storefronts to move in</Label>
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {storefronts.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={chosen.includes(s.id)}
                      onCheckedChange={(v) => setChosen((c) => (v === true ? [...c, s.id] : c.filter((id) => id !== s.id)))}
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!resellerFormReady(form) || pending} onClick={submit}>
              {pending && <Spinner />}
              Create reseller
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
