"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCheckIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { NOTIFICATIONS_READ } from "@/components/shell/notification-bell";
import { readNotifications } from "../actions";

/** Marks every notification read, here and on the bell. */
export function MarkAllRead() {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await readNotifications();
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          // The bell in the header clears its count at once rather than on its next check.
          window.dispatchEvent(new Event(NOTIFICATIONS_READ));
          router.refresh();
        })
      }>
      {pending ? <Spinner data-icon="inline-start" /> : <CheckCheckIcon data-icon="inline-start" />}
      Mark all as read
    </Button>
  );
}
