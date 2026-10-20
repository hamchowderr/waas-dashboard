import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getViewer } from "@/auth";
import { AccountCard } from "@/components/auth/account-card";
import { SignOutButton } from "@/components/auth/account-actions";
import type { ScopeArea } from "@/lib/connect-scopes";
import { connectHeaders } from "./headers";
import { ConnectForm } from "./connect-form";

export const metadata: Metadata = { title: "Connect an app" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ConnectRequest = {
  id: string;
  clientName: string;
  returnTo: string;
  wantsWrite: boolean;
  readOnly: boolean;
  /** One per area (stores, backups, domains, email, versions, site): a box to see and a box to change. */
  areas: ScopeArea[];
  /** True when the API took this person as a platform admin: every storefront is listed. */
  asAdmin?: boolean;
  storefronts: { productId: string; name: string; role: string; canChange: boolean }[];
};

/**
 * Where an AI app's connection lands when the person chooses to sign in (the API's approve page
 * sends them here): they pick a storefront, tick what the app may see and change, approve, and go
 * back to the app. A platform admin can pick any storefront.
 */
export default async function ConnectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?callbackUrl=${encodeURIComponent(`/connect/${id}`)}`);

  const request = UUID.test(id) && process.env.WAAS_API_URL ? await load(id, viewer) : null;
  if (!request) {
    return (
      <AccountCard title="This link has expired" description="Go back to the app and connect again. Each link works once, for 10 minutes.">
        <SignOutButton variant="ghost" />
      </AccountCard>
    );
  }

  if (request.storefronts.length === 0) {
    return (
      <AccountCard
        title={`Connect ${request.clientName}`}
        description={
          <>
            You&apos;re signed in as <strong>{viewer.user.email}</strong>, which isn&apos;t on a storefront&apos;s team yet. Ask its owner to invite
            you, or sign in with another address.
          </>
        }>
        <SignOutButton variant="ghost" then={`/login?callbackUrl=${encodeURIComponent(`/connect/${id}`)}`} />
      </AccountCard>
    );
  }

  return (
    <AccountCard
      title={`Connect ${request.clientName}`}
      description={
        <>
          <strong>{request.clientName}</strong> wants to use your stores as you ({viewer.user.email}). After you approve, you go back to{" "}
          <code>{request.returnTo}</code>.
        </>
      }>
      <ConnectForm id={request.id} areas={request.areas ?? []} storefronts={request.storefronts} asAdmin={request.asAdmin === true} />
    </AccountCard>
  );
}

async function load(id: string, viewer: { cookie: string; isAdmin: boolean }): Promise<ConnectRequest | null> {
  const response = await fetch(new URL(`/account/oauth/requests/${id}`, process.env.WAAS_API_URL), {
    headers: connectHeaders(viewer),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000)
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Provisioning API returned ${response.status} for the connection request`);
  return (await response.json()) as ConnectRequest;
}
