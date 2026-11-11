"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RotateCwIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { retryFailures } from "./actions";

/** Runs a failed task again from the Overview's "Needs you" list, so the fix is one click where the problem shows. */
export function RetryTask({ failureId, label }: { failureId: string; label: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const retry = () =>
    startTransition(async () => {
      const result = await retryFailures([failureId]);
      const error = !result.ok ? result.error : result.data.errors[0];
      if (error) {
        toast.error(error);
        return;
      }
      toast.success(`${label} queued again`);
      router.refresh();
    });
  return (
    <Button size="sm" variant="outline" disabled={pending} onClick={retry} aria-label={`Retry ${label}`}>
      {pending ? <Spinner /> : <RotateCwIcon aria-hidden />}
      Retry
    </Button>
  );
}
