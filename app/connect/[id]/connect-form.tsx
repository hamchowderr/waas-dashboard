"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { chosenScopes, initialScopes, toggleScope, type ScopeArea } from "@/lib/connect-scopes";
import { answerConnection, type ConnectAnswer } from "./actions";

type Storefront = { productId: string; name: string; role: string; canChange: boolean };

export function ConnectForm({ id, areas, storefronts, asAdmin }: { id: string; areas: ScopeArea[]; storefronts: Storefront[]; asAdmin: boolean }) {
  const [productId, setProductId] = React.useState(storefronts[0]!.productId);
  const chosen = storefronts.find((s) => s.productId === productId)!;
  const [ticked, setTicked] = React.useState(() => initialScopes(areas, chosen.canChange));
  const [pending, setPending] = React.useState<"approve" | "deny" | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const hasWrite = areas.some((a) => a.write);
  const scopes = chosenScopes(areas, ticked, chosen.canChange);

  function pick(next: string) {
    setProductId(next);
    // The boxes start over: a storefront where the person may only look has no change boxes ticked.
    setTicked(initialScopes(areas, storefronts.find((s) => s.productId === next)!.canChange));
  }

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
          <Select value={productId} onValueChange={pick}>
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
          {asAdmin && <p className="text-muted-foreground text-xs">You&apos;re a platform admin, so you can connect any storefront.</p>}
        </div>
      ) : (
        <p className="text-sm">
          Storefront: <strong>{chosen.name}</strong>
        </p>
      )}

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">What the app may do</legend>
        <div className="divide-y rounded-md border">
          {areas.map((a) => (
            <div key={a.area} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium">{a.name}</p>
                <p className="text-muted-foreground text-xs">
                  {a.read.label}
                  {a.write && chosen.canChange ? `. ${a.write.label}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <Box scope={a.read.scope} label="See" title={`${a.name}: see`} ticked={ticked} onChange={(s, on) => setTicked(toggleScope(areas, ticked, s, on))} />
                {a.write && (
                  <Box
                    scope={a.write.scope}
                    label="Change"
                    title={`${a.name}: change`}
                    ticked={ticked}
                    disabled={!chosen.canChange}
                    onChange={(s, on) => setTicked(toggleScope(areas, ticked, s, on))}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
        {hasWrite && !chosen.canChange && (
          <p className="text-muted-foreground text-sm">You can only look at this storefront, so the app can only look too.</p>
        )}
        {!hasWrite && <p className="text-muted-foreground text-sm">This app connected to the read-only address, so it can only look.</p>}
      </fieldset>

      {error && (
        <p role="alert" className="bg-destructive/10 text-destructive rounded-md border border-destructive/20 p-3 text-sm">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button variant="outline" disabled={pending !== null} onClick={() => void answer({ action: "deny" })}>
          {pending === "deny" ? "Cancelling…" : "Cancel"}
        </Button>
        <Button className="flex-1" disabled={pending !== null || scopes.length === 0} onClick={() => void answer({ action: "approve", productId, scopes })}>
          {pending === "approve" ? "Connecting…" : "Approve"}
        </Button>
      </div>
    </div>
  );
}

function Box({
  scope,
  label,
  title,
  ticked,
  disabled,
  onChange
}: {
  scope: string;
  label: string;
  title: string;
  ticked: Set<string>;
  disabled?: boolean;
  onChange: (scope: string, on: boolean) => void;
}) {
  const id = `scope-${scope.replace(":", "-")}`;
  return (
    <div className="flex items-center gap-1.5">
      <Checkbox id={id} aria-label={title} checked={!disabled && ticked.has(scope)} disabled={disabled} onCheckedChange={(v) => onChange(scope, v === true)} />
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
    </div>
  );
}
