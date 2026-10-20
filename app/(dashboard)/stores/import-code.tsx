"use client";

import * as React from "react";
import { Check, Copy, Download } from "lucide-react";
import { toast } from "sonner";

import type { ImportCode } from "@/lib/api/types";
import { Button } from "@/components/ui/button";

/** The import code with a copy button, the plugin download and what the site owner does with them. */
export function ImportCodeSteps({ code }: { code: ImportCode }) {
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code.importCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Select the code and copy it by hand.");
    }
  };

  return (
    <div className="space-y-4 text-sm">
      <ol className="list-decimal space-y-2 ps-5">
        <li>
          On the site you&apos;re moving, install the AnyPress Export plugin
          (Plugins, Add New, Upload Plugin) and activate it.
        </li>
        <li>
          Open Tools, Move to AnyPress, paste the code below and choose Send
          this site to AnyPress.
        </li>
        <li>
          This store sets itself up from the upload and shows Ready when
          it&apos;s done. The old site isn&apos;t changed.
        </li>
      </ol>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">Import code</span>
          <Button variant="outline" size="sm" onClick={copy}>
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <pre className="bg-muted max-h-28 overflow-auto rounded-md border p-2 font-mono text-xs break-all whitespace-pre-wrap">
          {code.importCode}
        </pre>
        <p className="text-muted-foreground text-xs">
          Works for 7 days, until the move starts. Anyone with it can send a
          site to this store, so share it only with the site owner.
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <a href={code.pluginUrl}>
          <Download />
          Download the plugin
        </a>
      </Button>
      <p className="text-muted-foreground text-xs">
        From the command line instead:{" "}
        <span className="font-mono">wp anypress-export send &lt;code&gt;</span>
      </p>
    </div>
  );
}
