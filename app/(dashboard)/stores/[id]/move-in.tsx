"use client";

import * as React from "react";
import { toast } from "sonner";

import { StatusCode, type ImportCode, type MoveIn } from "@/lib/api/types";
import { formatBytes, formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { renewImportCode } from "../../actions";
import { ImportCodeSteps } from "../import-code";
import { ReprintCopy } from "./reprint-copy";
import { SiteReportSection } from "./site-report";

/**
 * A store made to move a site in. While it waits: copy the site with Reprint (the main way), or send it
 * with the AnyPress Export plugin, whose code can't be shown again (only its hash is kept), so a new one
 * replaces it. Once the move started, where the site came from, why the move failed, what to check after
 * it, what's on the moved site (SiteReportSection), and, while it is on hold, copying it again.
 */
export function MoveInStatus({
  tenantId,
  moveIn,
  statusCode,
  onHold,
}: {
  tenantId: string;
  moveIn: MoveIn;
  statusCode: StatusCode;
  onHold: boolean;
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
    const failed = statusCode === StatusCode.Failed;
    const copying = statusCode === StatusCode.Pending;
    const from = moveIn.reprintSite ?? source.home;
    const when = formatDateTime(moveIn.startedAt);
    const summary = copying
      ? `Copying the site${from ? ` from ${from}` : ""}. This store shows Ready when it's done.`
      : moveIn.reprintSite
        ? `${failed ? "The copy with Reprint started" : moveIn.reprintCopies > 1 ? `Copied ${moveIn.reprintCopies} times with Reprint, last on` : "Copied with Reprint"} ${when} from ${moveIn.reprintSite}.`
        : `${moveIn.reason ? "The move started" : "Moved in"} ${when}${source.home ? ` from ${source.home}` : ""}.`;
    // Reprint can try a failed move again, and copy a site on hold again; never a live one.
    const retry = !!moveIn.migrationToken && failed;
    const again = !!moveIn.migrationToken && onHold && statusCode === StatusCode.Done;
    return (
      <div className="space-y-3 text-sm">
        <div className="space-y-1">
          <p>{summary}</p>
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
            <p className="text-destructive font-medium">
              {failed || !moveIn.reprintSite ? "The move failed" : "The last copy failed, so this store is as it was"}
            </p>
            <p>{moveIn.reason}</p>
          </div>
        )}
        {retry && (
          <>
            <Separator />
            <div className="space-y-3">
              <p className="font-medium">Try again with Reprint</p>
              <ReprintCopy tenantId={tenantId} migrationToken={moveIn.migrationToken!} site={from ?? null} />
            </div>
          </>
        )}
        {again && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="font-medium">Copy the site again</p>
              <ReprintCopy tenantId={tenantId} migrationToken={moveIn.migrationToken!} site={from ?? null} again />
            </div>
          </>
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

  const exportSteps = code ? (
    <ImportCodeSteps code={code} />
  ) : (
    <div className="space-y-3 text-sm">
      <p>
        The import code works until {formatDateTime(moveIn.expiresAt)}; after
        that, or if it was lost, get a new one.
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

  // From an older API, without a Migration Token: the export plugin only.
  if (!moveIn.migrationToken) {
    return (
      <div className="space-y-3 text-sm">
        <p>Waiting for the site.</p>
        {exportSteps}
      </div>
    );
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="space-y-3">
        <p className="font-medium">Copy the site with Reprint</p>
        <ReprintCopy tenantId={tenantId} migrationToken={moveIn.migrationToken} site={null} />
      </div>
      <Separator />
      <details className="group space-y-3">
        <summary className="cursor-pointer font-medium">
          Or send it with the AnyPress Export plugin
        </summary>
        <p className="text-muted-foreground mt-2">
          For a site that can&apos;t run Reprint, or whose host blocks the copy.
        </p>
        <div className="mt-3">{exportSteps}</div>
      </details>
    </div>
  );
}
