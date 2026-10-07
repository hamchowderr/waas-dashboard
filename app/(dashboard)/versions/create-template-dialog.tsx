"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { uploadArchive } from "@/lib/upload-archive";
import { ArchiveInput } from "@/components/admin/archive-input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { createTemplate } from "../actions";

// The API's rule for template names (WPCS createBaseSnapshot).
const NAME = /^[A-Za-z0-9 -]{5,50}$/;

/** Creates a template and uploads its archive to the address the API returns. */
export function CreateTemplateDialog({
  kind,
  onOpenChange,
  productId
}: {
  /** Which kind of template to upload; null keeps the dialog closed. */
  kind: "base" | "group" | null;
  onOpenChange: (open: boolean) => void;
  productId: string;
}) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [comment, setComment] = React.useState("");
  const [groupName, setGroupName] = React.useState("");
  const [showInConsole, setShowInConsole] = React.useState(true);
  const [file, setFile] = React.useState<File | null>(null);
  const [progress, setProgress] = React.useState<number | null>(null);
  const [pending, startTransition] = React.useTransition();

  const isGroup = kind === "group";
  const nameError = name && !NAME.test(name) ? "5 to 50 characters: letters, digits, spaces and dashes." : null;
  const ready = name && !nameError && comment.trim() && (!isGroup || groupName.trim()) && file;

  const submit = () =>
    startTransition(async () => {
      const result = await createTemplate(productId, {
        name,
        comment,
        isTenantSnapshot: isGroup,
        groupName: isGroup ? groupName : undefined,
        showInConsole: !isGroup && showInConsole
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (!result.data.uploadUrl || !file) {
        toast.error("The API created the template but returned no upload address.");
        return;
      }
      try {
        setProgress(0);
        await uploadArchive(result.data.uploadUrl, file, setProgress);
      } catch (error) {
        setProgress(null);
        toast.error(`Template ${name} was created, but the upload failed: ${(error as Error).message}`);
        router.refresh();
        return;
      }
      toast.success(`Template ${name} uploaded`);
      setName("");
      setComment("");
      setGroupName("");
      setFile(null);
      setProgress(null);
      onOpenChange(false);
      router.refresh();
    });

  return (
    <Dialog open={kind !== null} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isGroup ? "Upload a group template" : "Upload a base template"}</DialogTitle>
          <DialogDescription>
            {isGroup
              ? "A starting point for stores, copied into the versions you choose when you create them."
              : "A whole WordPress site that new versions can start from."}{" "}
            Upload it as a .tar.gz archive.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Name</Label>
            <Input
              id="template-name"
              value={name}
              maxLength={50}
              disabled={pending}
              aria-invalid={!!nameError}
              onChange={(event) => setName(event.target.value)}
            />
            {nameError && <p className="text-destructive text-xs">{nameError}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-comment">Description</Label>
            <Textarea
              id="template-comment"
              value={comment}
              rows={2}
              maxLength={500}
              disabled={pending}
              onChange={(event) => setComment(event.target.value)}
            />
          </div>
          {isGroup ? (
            <div className="space-y-2">
              <Label htmlFor="template-group">Group name</Label>
              <Input
                id="template-group"
                value={groupName}
                placeholder="e.g. store"
                maxLength={50}
                disabled={pending}
                onChange={(event) => setGroupName(event.target.value)}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Checkbox
                id="template-show"
                checked={showInConsole}
                disabled={pending}
                onCheckedChange={(checked) => setShowInConsole(checked === true)}
              />
              <Label htmlFor="template-show" className="font-normal">
                Offer it when creating a storefront&apos;s first version
              </Label>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="template-archive">Archive</Label>
            <ArchiveInput
              id="template-archive"
              accept=".gz,.tgz,application/gzip"
              file={file}
              onFile={setFile}
              progress={progress}
              disabled={pending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!ready || pending} onClick={submit}>
            {pending && <Spinner />}
            Create and upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
