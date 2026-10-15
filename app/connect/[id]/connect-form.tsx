"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { answerConnection, type ConnectAnswer } from "./actions";

type Storefront = { productId: string; name: string; role: string; canChange: boolean };

export function ConnectForm({ id, wantsWrite, storefronts }: { id: string; wantsWrite: boolean; storefronts: Storefront[] }) {
  const [productId, setProductId] = React.useState(storefronts[0]!.productId);
  const [allowWrite, setAllowWrite] = React.useState(true);
  const [pending, setPending] = React.useState<"approve" | "deny" | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const chosen = storefronts.find((s) => s.productId === productId)!;

  async function answer(a: ConnectAnswer) {
    setPending(a.action);
    setError(null);
    const result = await answerConnection(id, a);
    if (!result.ok) {
      setError(result.error);
      setPending(null);
      return;
    }
    // The app's own address: a web page, or an app scheme such as claude:// or cursor://.
    window.location.assign(result.redirectUrl);
  }

  return (
    <div className="space-y-4">
      {storefronts.length > 1 ? (
        <div className="space-y-1.5">
          <Label>Storefront</Label>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {storefronts.map((s) => (
                <SelectItem key={s.productId} value={s.productId}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <p className="text-sm">
          Storefront: <strong>{chosen.name}</strong>
        </p>
      )}
      <ul className="text-muted-foreground list-disc space-y-1 ps-5 text-sm">
        <li>See its stores, their domains, backups and versions</li>
        {wantsWrite && chosen.canChange && <li>Create, change, suspend, restore and delete stores, if you allow it below</li>}
      </ul>
      {wantsWrite &&
        (chosen.canChange ? (
          <div className="flex items-start gap-2">
            <Checkbox id="allow-write" checked={allowWrite} onCheckedChange={(v) => setAllowWrite(v === true)} />
            <Label htmlFor="allow-write" className="font-normal">
              Allow it to make changes, not only look
            </Label>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">You can only look at this storefront, so the app can only look too.</p>
        ))}
      {error && (
        <p role="alert" className="bg-destructive/10 text-destructive rounded-md border border-destructive/20 p-3 text-sm">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button variant="outline" disabled={pending !== null} onClick={() => void answer({ action: "deny" })}>
          {pending === "deny" ? "Cancelling…" : "Cancel"}
        </Button>
        <Button className="flex-1" disabled={pending !== null} onClick={() => void answer({ action: "approve", productId, allowWrite })}>
          {pending === "approve" ? "Connecting…" : "Approve"}
        </Button>
      </div>
    </div>
  );
}
