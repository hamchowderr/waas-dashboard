"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { copyWithReprint } from "../../actions";

/**
 * Copying the old site in with WordPress's Reprint plugin: the owner authorizes this store's Migration Token on
 * the old site, then the store copies the site itself. `again` is a store on hold being copied again, which brings
 * what changed on the old site and replaces what the store holds now.
 */
export function ReprintCopy({
  tenantId,
  migrationToken,
  site,
  again = false,
}: {
  tenantId: string;
  migrationToken: string;
  site: string | null;
  again?: boolean;
}) {
  const router = useRouter();
  const [address, setAddress] = React.useState(site ?? "");
  const [copied, setCopied] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const id = React.useId();

  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(migrationToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Select the token and copy it by hand.");
    }
  };

  const start = () =>
    startTransition(async () => {
      const result = await copyWithReprint(tenantId, address.trim());
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(again ? "Copying the site again" : "Copying the site");
      router.refresh();
    });

  const token = (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">Migration Token</span>
        <Button type="button" variant="outline" size="sm" onClick={copyToken}>
          {copied ? <Check /> : <Copy />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="bg-muted max-h-20 overflow-auto rounded-md border p-2 font-mono text-xs break-all whitespace-pre-wrap">
        {migrationToken}
      </pre>
    </div>
  );

  return (
    <form
      className="space-y-4 text-sm"
      onSubmit={(event) => {
        event.preventDefault();
        if (address.trim()) start();
      }}
    >
      {again ? (
        <p className="text-muted-foreground">
          Brings what changed on the old site since the last copy. It replaces
          everything on this store, so changes made here are lost. Do it last,
          just before you go live.
        </p>
      ) : (
        <>
          <ol className="list-decimal space-y-2 ps-5">
            <li>
              On the site you&apos;re moving, install the Reprint plugin
              (Plugins, Add New Plugin, search for Reprint) and activate it.
            </li>
            <li>
              Open Tools, Reprint Server, paste this store&apos;s Migration
              Token and choose Authorize client.
            </li>
            <li>
              Enter the old site&apos;s address below and start the copy. This
              store copies the site and shows Ready when it&apos;s done. The
              old site isn&apos;t changed.
            </li>
          </ol>
          {token}
        </>
      )}
      <div className="space-y-2">
        <Label htmlFor={`${id}-site`}>Old site&apos;s address</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id={`${id}-site`}
            value={address}
            inputMode="url"
            placeholder="https://example.com"
            autoComplete="off"
            disabled={pending}
            onChange={(event) => setAddress(event.target.value)}
          />
          <Button
            type="submit"
            variant={again ? "outline" : "default"}
            disabled={pending || !address.trim()}
            className="shrink-0"
          >
            {pending && <Spinner />}
            {again ? "Copy again" : "Start the copy"}
          </Button>
        </div>
      </div>
      {again && (
        <details className="text-muted-foreground text-xs">
          <summary className="cursor-pointer">Show the Migration Token</summary>
          <div className="text-foreground mt-2 text-sm">{token}</div>
        </details>
      )}
    </form>
  );
}
