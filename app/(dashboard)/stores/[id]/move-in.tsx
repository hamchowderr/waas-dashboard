"use client";

import * as React from "react";
import { toast } from "sonner";

import type { ImportCode, MoveIn } from "@/lib/api/types";
import { formatBytes, formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { renewImportCode } from "../../actions";
import { ImportCodeSteps } from "../import-code";

/**
 * A store made to move a site in. While it waits, the code can't be shown again (only its hash is
 * kept), so a new one replaces it. Once the move started, what the plugin told about the old site.
 */
export function MoveInStatus({
  tenantId,
  moveIn,
}: {
  tenantId: string;
  moveIn: MoveIn;
}) {
  const [code, setCode] = React.useState<ImportCode | null>(null);
  const [pending, startTransition] = React.useTransition();

  const renew = () =>
    startTransition(async () => {
      const result = await renewImportCode(tenantId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setCode(result.data);
    });

  if (moveIn.startedAt) {
    const source = moveIn.source ?? {};
    return (
      <div className="space-y-1 text-sm">
        <p>
          Moved in {formatDateTime(moveIn.startedAt)}
          {source.home ? ` from ${source.home}` : ""}.
        </p>
        {(source.wordPressVersion || source.uploadedBytes) && (
          <p className="text-muted-foreground">
            {[
              source.wordPressVersion && `WordPress ${source.wordPressVersion}`,
              source.uploadedBytes &&
                `${formatBytes(source.uploadedBytes)} uploaded`,
            ]
              .filter(Boolean)
              .join(", ")}
          </p>
        )}
      </div>
    );
  }

  if (code) return <ImportCodeSteps code={code} />;

  return (
    <div className="space-y-3 text-sm">
      <p>
        Waiting for the site. The import code works until{" "}
        {formatDateTime(moveIn.expiresAt)}; after that, or if it was lost, get a
        new one.
      </p>
      <Button variant="outline" size="sm" disabled={pending} onClick={renew}>
        {pending && <Spinner />}
        Get a new import code
      </Button>
      <p className="text-muted-foreground text-xs">
        The code given before stops working.
      </p>
    </div>
  );
}
