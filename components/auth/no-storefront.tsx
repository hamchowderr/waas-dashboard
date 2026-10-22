import type { Viewer } from "@/auth";
import { sellerAddress } from "@/lib/dashboard-host";
import { AccountCard } from "./account-card";
import { SignOutButton, StorefrontPicker } from "./account-actions";

/** For someone signed in who isn't a platform admin and has no storefront to act for. */
export async function NoStorefront({ viewer }: { viewer: Viewer }) {
  const seller = await sellerAddress();
  if (seller) {
    const name = seller.brand?.name ?? seller.productName ?? "this storefront";
    return (
      <AccountCard
        title="Not on this team"
        description={
          <>
            Signed in as {viewer.user.email}, which isn&apos;t on {name}&apos;s team. Ask {name} to invite this address, or sign
            in with the one they invited.
          </>
        }>
        <SignOutButton />
      </AccountCard>
    );
  }
  if (viewer.memberships.length > 1) {
    return (
      <AccountCard title="Choose a storefront" description={`Signed in as ${viewer.user.email}. You belong to more than one.`}>
        <StorefrontPicker storefronts={viewer.memberships} />
        <SignOutButton variant="ghost" />
      </AccountCard>
    );
  }
  return (
    <AccountCard
      title="No storefront yet"
      description={
        <>
          Signed in as {viewer.user.email}, which isn&apos;t part of a storefront. Open the invitation link you were sent, or ask
          the person who invited you to send one to this address.
        </>
      }>
      <SignOutButton />
    </AccountCard>
  );
}
