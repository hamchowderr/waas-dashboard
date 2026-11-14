"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArchiveIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { createBackup } from "../../actions";

/** Takes a backup of the live store now, on top of the nightly ones. */
export function BackUpNow({ tenantId, storeName }: { tenantId: string; storeName: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const submit = () =>
    startTransition(async () => {
      const result = await createBackup(tenantId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Backing up ${storeName}. It shows Done here when it's finished.`);
      router.refresh();
    });

  return (
    <Button variant="outline" size="sm" onClick={submit} disabled={pending}>
      {pending ? <Spinner data-icon="inline-start" /> : <ArchiveIcon data-icon="inline-start" />}
      Back up now
    </Button>
  );
}
