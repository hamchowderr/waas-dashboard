"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ConfirmAction } from "@/components/admin/confirm-action";
import { Button } from "@/components/ui/button";
import { sendResellerInvoice } from "../../actions";

/** Sends a finished month's bill through Stripe now, or tries a failed one again. A month is never sent twice. */
export function SendInvoice({
  id,
  month,
  label,
  total,
  to,
  retry
}: {
  id: string;
  month: string;
  label: string;
  total: string;
  to: string | null;
  retry: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button size="sm" variant={retry ? "default" : "outline"} onClick={() => setOpen(true)}>
        {retry ? "Try again" : "Send now"}
      </Button>
      <ConfirmAction
        open={open}
        onOpenChange={setOpen}
        title={`Send the ${label} bill?`}
        description={
          <p>
            Stripe charges {total} to the card on file, or emails the invoice{to ? ` to ${to}` : ""} to pay online. It is sent once; asking
            again shows the same invoice.
          </p>
        }
        confirmLabel="Send"
        onConfirm={async () => {
          const result = await sendResellerInvoice(id, month);
          if (!result.ok) {
            toast.error(result.error);
            return false;
          }
          if (result.data.status === "failed") toast.error(result.data.error ?? "Stripe didn't take the invoice");
          else if (result.data.status === "nothing_due") toast.success("Nothing to charge that month");
          else toast.success("Sent");
          router.refresh();
          return true;
        }}
      />
    </>
  );
}
