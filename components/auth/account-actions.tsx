"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { acceptInvitation, setActiveOrganization, signOut } from "@/lib/auth-client";

function useAction() {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  async function run(key: string, work: () => Promise<void>, then: string) {
    setPending(key);
    setError(null);
    try {
      await work();
      router.replace(then);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setPending(null);
    }
  }
  return { pending, error, run };
}

function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="bg-destructive/10 text-destructive rounded-md border border-destructive/20 p-3 text-sm">
      {error}
    </p>
  );
}

/** `then`: where to go once signed out; by default the sign-in page. */
export function SignOutButton({ variant = "outline", then = "/login" }: { variant?: "outline" | "ghost"; then?: string }) {
  const { pending, error, run } = useAction();
  return (
    <>
      <ErrorNote error={error} />
      <Button variant={variant} className="w-full" disabled={pending !== null} onClick={() => void run("out", signOut, then)}>
        {pending ? "Signing out…" : "Sign out"}
      </Button>
    </>
  );
}

/** One button per storefront, for someone in several who hasn't picked one. */
export function StorefrontPicker({ storefronts }: { storefronts: { organizationId: string; productName: string }[] }) {
  const { pending, error, run } = useAction();
  return (
    <div className="space-y-2">
      <ErrorNote error={error} />
      {storefronts.map((s) => (
        <Button
          key={s.organizationId}
          className="w-full"
          disabled={pending !== null}
          onClick={() => void run(s.organizationId, () => setActiveOrganization(s.organizationId), "/")}>
          {pending === s.organizationId ? "Opening…" : s.productName}
        </Button>
      ))}
    </div>
  );
}

export function AcceptInvitationButton({ invitationId }: { invitationId: string }) {
  const { pending, error, run } = useAction();
  return (
    <div className="space-y-3">
      <ErrorNote error={error} />
      <Button className="w-full" disabled={pending !== null} onClick={() => void run("accept", () => acceptInvitation(invitationId), "/")}>
        {pending ? "Joining…" : "Accept invitation"}
      </Button>
    </div>
  );
}
