"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ConfirmAction } from "@/components/admin/confirm-action";
import { Button } from "@/components/ui/button";
import { deleteReseller } from "../../actions";

/** Deleting is only offered once every storefront has been moved out. */
export function DeleteReseller({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Delete
      </Button>
      <ConfirmAction
        open={open}
        onOpenChange={setOpen}
        title={`Delete ${name}?`}
        description={<p>It has no storefronts. Its usage history is kept.</p>}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          const result = await deleteReseller(id);
          if (!result.ok) {
            toast.error(result.error);
            return false;
          }
          router.push("/resellers");
          return true;
        }}
      />
    </>
  );
}
