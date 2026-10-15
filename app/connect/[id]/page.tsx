import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getViewer } from "@/auth";
import { AccountCard } from "@/components/auth/account-card";
import { SignOutButton } from "@/components/auth/account-actions";
import { ConnectForm } from "./connect-form";

export const metadata: Metadata = { title: "Connect an app" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ConnectRequest = {
  id: string;
  clientName: string;
  returnTo: string;
  wantsWrite: boolean;
  storefronts: { productId: string; name: string; role: string; canChange: boolean }[];
};

/**
 * Where an AI app's connection lands when the person chooses to sign in (the API's approve page
 * sends them here): they pick a storefront and approve, and go back to the app.
 */
export default async function ConnectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?callbackUrl=${encodeURIComponent(`/connect/${id}`)}`);

  const request = UUID.test(id) && process.env.WAAS_API_URL ? await load(id, viewer.cookie) : null;
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
      <ConnectForm id={request.id} wantsWrite={request.wantsWrite} storefronts={request.storefronts} />
    </AccountCard>
  );
}

async function load(id: string, cookie: string): Promise<ConnectRequest | null> {
  const response = await fetch(new URL(`/account/oauth/requests/${id}`, process.env.WAAS_API_URL), {
    headers: { Cookie: cookie, "X-Session-Auth": "1", Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000)
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Provisioning API returned ${response.status} for the connection request`);
  return (await response.json()) as ConnectRequest;
}
