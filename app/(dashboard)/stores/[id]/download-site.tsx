"use client";

import * as React from "react";
import { DownloadIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { StatusCode, type SiteDownload } from "@/lib/api/types";
import { formatAgo, formatBytes, formatDate } from "@/lib/format";
import { siteDownloadStatus, startSiteDownload } from "../../actions";

/** How often the dialog asks again while a copy is being made. */
const POLL_MS = 5000;

/**
 * "Download site": a copy of the whole site (WordPress, every file and the database, with a README on restoring it)
 * as one zip that restores on any WordPress host. Opens on the newest copy of the last week; a new one takes a few
 * minutes and the dialog waits for it. Each link works for an hour, so it is fetched fresh when the dialog opens.
 */
export function DownloadSite({ tenantId, storeName }: { tenantId: string; storeName: string }) {
  const [open, setOpen] = React.useState(false);
  const [download, setDownload] = React.useState<SiteDownload | null | undefined>(undefined);
  const [starting, setStarting] = React.useState(false);

  const refresh = React.useCallback(async () => {
    const result = await siteDownloadStatus(tenantId);
    if (result.ok) setDownload(result.data);
    else toast.error(result.error);
  }, [tenantId]);

  const show = () => {
    setDownload(undefined);
    setOpen(true);
    void refresh();
  };

  const pending = download?.statusCode === StatusCode.Pending;
  React.useEffect(() => {
    if (!open || !pending) return;
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [open, pending, refresh]);

  const start = async () => {
    setStarting(true);
    try {
      const result = await startSiteDownload(tenantId);
      if (result.ok) setDownload(result.data);
      else toast.error(result.error);
    } finally {
      setStarting(false);
    }
  };

  const ready = download?.statusCode === StatusCode.Done && download.url;
  const failed = download?.statusCode === StatusCode.Failed;

  return (
    <>
      <Button variant="outline" size="sm" onClick={show}>
        <DownloadIcon />
        Download site
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Download {storeName}</DialogTitle>
            <DialogDescription>
              The whole site in one zip: WordPress, its themes, plugins and uploads, and the database, with a README on
              putting it up at any WordPress host. The site keeps running while the copy is made.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted/50 rounded-lg border p-4 text-sm" aria-live="polite">
            {download === undefined ? (
              <p className="text-muted-foreground flex items-center gap-2">
                <Spinner /> Checking for a recent copy…
              </p>
            ) : pending ? (
              <div className="space-y-1">
                <p className="flex items-center gap-2 font-medium">
                  <Spinner /> Making the copy…
                </p>
                <p className="text-muted-foreground">
                  Usually a few minutes; sites with large media libraries take longer. You can close this and come back.
                </p>
              </div>
            ) : ready ? (
              <div className="space-y-1">
                <p className="font-medium break-all">{download.fileName}</p>
                <p className="text-muted-foreground">
                  {formatBytes(download.sizeBytes)} · made {formatAgo(download.dateDone ?? download.dateCreated)} · kept until{" "}
                  {formatDate(download.expiresAt)}
                </p>
              </div>
            ) : failed ? (
              <p className="text-destructive">The last copy could not be made. The site itself is fine. Try again.</p>
            ) : (
              <p className="text-muted-foreground">No copy from the last week. Make one now.</p>
            )}
          </div>

          <DialogFooter>
            {download !== undefined && !pending && (
              <Button variant={ready ? "outline" : "default"} disabled={starting} onClick={start}>
                {starting && <Spinner />}
                {ready ? "Make a new copy" : failed ? "Try again" : "Make a copy"}
              </Button>
            )}
            {ready && (
              <Button asChild>
                <a href={download.url!} download={download.fileName}>
                  <DownloadIcon />
                  Download zip
                </a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
