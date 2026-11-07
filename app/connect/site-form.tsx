"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { connectWebsite } from "./actions";

/** The website's address for "Sign in with your website"; the API sends the browser to that website's WordPress dashboard. */
export function SiteForm({ oauthQuery }: { oauthQuery: string }) {
  const [site, setSite] = React.useState("");
  const [pending, setPending] = React.useState<"site" | "deny" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function send(answer: { site: string } | { action: "deny" }) {
    setPending("site" in answer ? "site" : "deny");
    setError(null);
    const result = await connectWebsite(oauthQuery, answer);
    if (!result.ok) {
      setError(result.error);
      setPending(null);
      return;
    }
    window.location.assign(result.redirectUrl);
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void send({ site });
      }}>
      <div className="space-y-1.5">
        <Label htmlFor="site">Website address</Label>
        <Input id="site" value={site} inputMode="url" autoComplete="url" placeholder="mybakery.com" onChange={(e) => setSite(e.target.value)} />
      </div>
      {error && (
        <p role="alert" className="bg-destructive/10 text-destructive rounded-md border border-destructive/20 p-3 text-sm">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="button" variant="outline" disabled={pending !== null} onClick={() => void send({ action: "deny" })}>
          {pending === "deny" ? "Cancelling…" : "Cancel"}
        </Button>
        <Button type="submit" className="flex-1" disabled={pending !== null || !site.trim()}>
          {pending === "site" ? "Finding your website…" : "Continue"}
        </Button>
      </div>
    </form>
  );
}
