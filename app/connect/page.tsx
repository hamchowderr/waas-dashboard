import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getViewer } from "@/auth";
import { AccountCard } from "@/components/auth/account-card";
import { SignOutButton } from "@/components/auth/account-actions";
import type { ScopeArea } from "@/lib/connect-scopes";
import { connectHeaders } from "./headers";
import { ConnectForm } from "./connect-form";
import { SiteForm } from "./site-form";

export const metadata: Metadata = { title: "Connect an app" };

type ConnectRequest = {
  clientName: string;
  returnTo: string;
  wantsWrite: boolean;
  readOnly: boolean;
  /** One per area the app asked for: a box to see and a box to change. */
  areas: ScopeArea[];
  /** True when the API took this person as a platform admin: every storefront is listed. */
  asAdmin?: boolean;
  storefronts: { productId: string; name: string; role: string; canChange: boolean }[];
  /** The HighLevel app, connecting as an agency: it makes sites for the agency's sub-accounts. */
  forApps?: boolean;
  /** For the HighLevel app, someone with no storefront may make one here. */
  canCreateStorefront?: boolean;
};

type Query = Record<string, string | string[] | undefined>;

/** The sign-in request as the API's sign-in (Better Auth's MCP plugin) signed it, in its own order. */
function signedQuery(query: Query): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) params.append(key, v);
  }
  return params.toString();
}

/**
 * Where an AI app's sign-in lands (the API's sign-in sends the browser here, with its signed request):
 * the person signs in, picks a storefront, ticks what the app may see and change, approves, and goes
 * back to the app. A platform admin can pick any storefront. An app connecting to one website
 * (/mcp/site) asks for that website's address instead, and its owner approves in its WordPress dashboard.
 */
export default async function ConnectPage({ searchParams }: { searchParams: Promise<Query> }) {
  const oauthQuery = signedQuery(await searchParams);
  const params = new URLSearchParams(oauthQuery);
  if (!params.get("sig")) return <Expired />;

  if ((params.get("resource") ?? "").endsWith("/mcp/site")) {
    return (
      <AccountCard
        title="Connect your website"
        description="Type your website's address. You'll approve the app in your website's WordPress dashboard, and it can then work on that website only.">
        <SiteForm oauthQuery={oauthQuery} />
      </AccountCard>
    );
  }

  const here = `/connect?${oauthQuery}`;
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?callbackUrl=${encodeURIComponent(here)}`);

  const request = process.env.WAAS_API_FIXTURES === "1" ? sampleRequest() : process.env.WAAS_API_URL ? await load(oauthQuery, viewer) : null;
  if (!request) return <Expired />;

  if (request.storefronts.length === 0 && request.canCreateStorefront) {
    return (
      <AccountCard
        title={`Connect ${request.clientName}`}
        description={
          <>
            <strong>{request.clientName}</strong> wants to make and manage websites for your sub-accounts, as you ({viewer.user.email}). Name your
            AnyPress storefront: it keeps every site your sub-accounts make, each tied to its own sub-account. After you approve, you go back to{" "}
            <code>{request.returnTo}</code>.
          </>
        }>
        <ConnectForm oauthQuery={oauthQuery} areas={request.areas ?? []} storefronts={[]} asAdmin={false} newStorefront />
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
        <SignOutButton variant="ghost" then={`/login?callbackUrl=${encodeURIComponent(here)}`} />
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
      <ConnectForm oauthQuery={oauthQuery} areas={request.areas ?? []} storefronts={request.storefronts} asAdmin={request.asAdmin === true} />
    </AccountCard>
  );
}

function Expired() {
  return (
    <AccountCard title="This link has expired" description="Go back to the app and connect again.">
      <SignOutButton variant="ghost" />
    </AccountCard>
  );
}

async function load(oauthQuery: string, viewer: { cookie: string; isAdmin: boolean }): Promise<ConnectRequest | null> {
  const url = new URL("/account/oauth/connect", process.env.WAAS_API_URL);
  url.searchParams.set("oauth_query", oauthQuery);
  const response = await fetch(url, { headers: await connectHeaders(viewer), cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (response.status === 404 || response.status === 400) return null;
  if (!response.ok) throw new Error(`Provisioning API returned ${response.status} for the connection request`);
  return (await response.json()) as ConnectRequest;
}

/** Sample mode (WAAS_API_FIXTURES=1): the HighLevel app connecting for an agency with no storefront yet. */
function sampleRequest(): ConnectRequest {
  const box = (scope: string, label: string) => ({ scope, label, ticked: true });
  return {
    clientName: "HighLevel",
    returnTo: "services.leadconnectorhq.com",
    wantsWrite: true,
    readOnly: false,
    areas: [
      { area: "stores", name: "Stores", read: box("stores:read", "See your stores and their status"), write: box("stores:write", "Create, change, suspend, resume, move and delete stores") },
      { area: "webhooks", name: "Webhooks", read: box("webhooks:read", "See webhook endpoints and their deliveries"), write: box("webhooks:write", "Add, change, test and remove webhook endpoints") }
    ],
    storefronts: [],
    forApps: true,
    canCreateStorefront: true
  };
}
