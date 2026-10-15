import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getViewer } from "@/auth";
import { AccountCard } from "@/components/auth/account-card";
import { AcceptInvitationButton, SignOutButton } from "@/components/auth/account-actions";

export const metadata: Metadata = { title: "Invitation" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Where an invitation link (the API's acceptUrl) lands. The person signs in first, with the
 * address the invitation went to, then joins the storefront.
 */
export default async function InvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?callbackUrl=${encodeURIComponent(`/invite/${id}`)}`);

  if (!UUID.test(id)) {
    return (
      <AccountCard title="Invitation not found" description="Check that the link is complete, or ask for a new invitation.">
        <SignOutButton variant="ghost" />
      </AccountCard>
    );
  }

  return (
    <AccountCard
      title="Join a storefront"
      description={
        <>
          You&apos;re signed in as <strong>{viewer.user.email}</strong>. The invitation must have been sent to this address. If it
          went to another one, sign out and sign in with that account.
        </>
      }>
      <AcceptInvitationButton invitationId={id} />
      <SignOutButton variant="ghost" then={`/login?callbackUrl=${encodeURIComponent(`/invite/${id}`)}`} />
    </AccountCard>
  );
}
