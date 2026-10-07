"use client";

import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/format";
import { uploadSizeError } from "@/lib/upload-archive";

/** File picker for a site archive, with the upload's progress once it starts. */
export function ArchiveInput({
  id,
  accept,
  file,
  onFile,
  progress,
  disabled
}: {
  id: string;
  accept: string;
  file: File | null;
  onFile: (file: File | null) => void;
  progress: number | null;
  disabled?: boolean;
}) {
  const sizeError = uploadSizeError(file);
  return (
    <div className="space-y-2">
      <Input
        id={id}
        type="file"
        accept={accept}
        disabled={disabled}
        aria-invalid={!!sizeError}
        onChange={(event) => onFile(event.target.files?.[0] ?? null)}
      />
      {file && (
        <p className="text-muted-foreground text-xs">
          {file.name} · {formatBytes(file.size)}
        </p>
      )}
      {sizeError && <p className="text-destructive text-xs">{sizeError}</p>}
      {progress !== null && (
        <div className="space-y-1">
          <Progress value={progress * 100} />
          <p className="text-muted-foreground text-xs tabular-nums">Uploading… {Math.round(progress * 100)}%</p>
        </div>
      )}
    </div>
  );
}
