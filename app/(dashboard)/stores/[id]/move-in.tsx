"use client";

import * as React from "react";
import { toast } from "sonner";

import type { ImportCode, MoveIn } from "@/lib/api/types";
import { formatBytes, formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { renewImportCode } from "../../actions";
import { ImportCodeSteps } from "../import-code";
import { SiteReportSection } from "./site-report";

/**
 * A store made to move a site in. While it waits, the code can't be shown again (only its hash is
 * kept), so a new one replaces it. Once the move started, what the plugin told about the old site, why
 * the move failed, what to check after it, and what's on the moved site (SiteReportSection).
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
      <div className="space-y-3 text-sm">
        <div className="space-y-1">
          <p>
            {moveIn.reason ? "The move started" : "Moved in"} {formatDateTime(moveIn.startedAt)}
            {source.home ? ` from ${source.home}` : ""}.
          </p>
          {(source.wordPressVersion || source.phpVersion || source.uploadedBytes) && (
            <p className="text-muted-foreground">
              {[
                source.wordPressVersion && `WordPress ${source.wordPressVersion}`,
                source.phpVersion && `PHP ${source.phpVersion}`,
                source.uploadedBytes &&
                  `${formatBytes(source.uploadedBytes)} uploaded`,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
        </div>
        {moveIn.reason && (
          <div
            role="alert"
            className="border-destructive/20 bg-destructive/5 space-y-1 rounded-lg border p-3"
          >
            <p className="text-destructive font-medium">The move failed</p>
            <p>{moveIn.reason}</p>
          </div>
        )}
        {moveIn.warnings.length > 0 && (
          <div className="space-y-1.5">
            <p className="font-medium">Check after the move</p>
            <ul className="text-muted-foreground list-disc space-y-1 ps-5 break-words">
              {moveIn.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
        {moveIn.siteReport && (
          <>
            <Separator />
            <SiteReportSection report={moveIn.siteReport} />
          </>
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
