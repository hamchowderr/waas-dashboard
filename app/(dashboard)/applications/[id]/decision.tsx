"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { SellerApplication } from "@/lib/api/types";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { approveApplication, declineApplication } from "../../actions";

/** Approve (with its store limit and storefront) or decline a waiting application. */
export function ApplicationDecision({ application, storeDomain }: { application: SellerApplication; storeDomain: string }) {
  const router = useRouter();
  const [limit, setLimit] = React.useState("3");
  const [storefront, setStorefront] = React.useState(application.wantsStorefront);
  const [confirm, setConfirm] = React.useState<"approve" | "decline" | null>(null);
  const limitValue = limit.trim() === "" ? null : Number(limit);
  const limitOk = limitValue === null || (Number.isInteger(limitValue) && limitValue >= 0);

  const approve = async () => {
    const result = await approveApplication(application.id, limitValue, storefront);
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    const { invitation, storefront: built, storefrontError } = result.data;
    if (storefrontError) toast.warning(`Approved, but the storefront wasn't built: ${storefrontError}`);
    else if (built) toast.success(`Approved. Building their storefront at ${built.domain}.`);
    else toast.success("Approved.");
    if (!invitation.emailed) toast.warning(`The email didn't go. Send them this link: ${invitation.acceptUrl}`, { duration: 60_000 });
    router.refresh();
    return true;
  };

  const decline = async () => {
    const result = await declineApplication(application.id);
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    toast.success("Declined. We emailed them.");
    router.refresh();
    return true;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="limit">Store limit</Label>
        <Input id="limit" inputMode="numeric" value={limit} onChange={(e) => setLimit(e.target.value)} className="w-24" />
        <p className={limitOk ? "text-muted-foreground text-sm" : "text-destructive text-sm"}>
          {limitOk ? "How many stores they can make. Empty means no limit. You can raise it later." : "A whole number, or empty."}
        </p>
      </div>
      <div className="flex items-start gap-2">
        <Checkbox id="storefront" checked={storefront} onCheckedChange={(v) => setStorefront(v === true)} />
        <div className="space-y-1">
          <Label htmlFor="storefront">Build their ready-made storefront</Label>
          <p className="text-muted-foreground text-sm">
            {application.wantsStorefront
              ? `They asked for one${application.storefrontSubdomain ? ` at ${application.storefrontSubdomain}.${storeDomain}` : ""}.`
              : "They said they'll sell from their own WordPress site."}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={!limitOk} onClick={() => setConfirm("approve")}>
          Approve
        </Button>
        <Button variant="outline" onClick={() => setConfirm("decline")}>
          Decline
        </Button>
      </div>
      <ConfirmAction
        open={confirm === "approve"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={`Approve ${application.business}?`}
        description={
          <>
            <p>
              This makes their storefront with {limitValue === null ? "no store limit" : `a limit of ${limitValue} stores`} and emails{" "}
              {application.email} a link to sign in as its owner.
            </p>
            {storefront && <p>It also builds their ready-made storefront.</p>}
          </>
        }
        confirmLabel="Approve"
        onConfirm={approve}
      />
      <ConfirmAction
        open={confirm === "decline"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={`Decline ${application.business}?`}
        description={<p>We&apos;ll email {application.email} that they weren&apos;t approved. They can apply again.</p>}
        confirmLabel="Decline"
        destructive
        onConfirm={decline}
      />
    </div>
  );
}
