"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { Template } from "@/lib/api/types";
import { uploadArchive, uploadSizeError } from "@/lib/upload-archive";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { createVersion } from "../actions";

const PHP_VERSIONS = ["8.4", "8.3", "8.2", "8.1"];
// The API's rule for version names (createVersion).
const NAME = /^[A-Za-z0-9.-]{1,30}$/;

export function CreateVersionDialog({
  open,
  onOpenChange,
  productId,
  versionNames,
  baseTemplates,
  groupTemplates
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  versionNames: string[];
  baseTemplates: Template[];
  groupTemplates: Template[];
}) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [wordPressVersion, setWordPressVersion] = React.useState("6.8");
  const [phpVersion, setPhpVersion] = React.useState("8.3");
  const [chosenSource, setSource] = React.useState<"template" | "upload">("template");
  const [chosenTemplateId, setTemplateId] = React.useState("");
  // Derived, so a template uploaded or deleted while the page is open is reflected.
  const source = baseTemplates.length ? chosenSource : "upload";
  const templateId = baseTemplates.some((t) => t.id === chosenTemplateId)
    ? chosenTemplateId
    : (baseTemplates.find((t) => t.isDefault)?.id ?? baseTemplates[0]?.id ?? "");
  const [unchecked, setUnchecked] = React.useState<string[]>([]);
  // Every group template is copied unless unticked.
  const copyIds = groupTemplates.map((t) => t.id).filter((id) => !unchecked.includes(id));
  const [file, setFile] = React.useState<File | null>(null);
  const [progress, setProgress] = React.useState<number | null>(null);
  const [pending, startTransition] = React.useTransition();

  const nameError =
    name && !NAME.test(name)
      ? "At most 30 characters: letters, digits, dashes and dots."
      : versionNames.includes(name)
        ? "A version with this name already exists."
        : null;
  const ready =
    name && !nameError && wordPressVersion && (source === "template" ? templateId : file !== null && !uploadSizeError(file));

  const reset = () => {
    setName("");
    setFile(null);
    setProgress(null);
  };

  const submit = () =>
    startTransition(async () => {
      const result = await createVersion(productId, {
        name,
        wordPressVersion,
        phpVersion,
        snapshotIdsToCopy: copyIds,
        ...(source === "template"
          ? { snapshotId: templateId }
          : { useCustomUpload: true, asZip: file?.name.toLowerCase().endsWith(".zip") ?? false })
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (source === "upload" && file) {
        if (!result.data.uploadUrl) {
          toast.error("The API created the version but returned no upload address.");
          return;
        }
        try {
          setProgress(0);
          await uploadArchive(result.data.uploadUrl, file, setProgress);
        } catch (error) {
          setProgress(null);
          toast.error(`Version ${name} was created, but the upload failed: ${(error as Error).message}`);
          router.refresh();
          return;
        }
      }
      toast.success(`Building version ${name}. It shows Ready when it's done.`);
      reset();
      onOpenChange(false);
      router.refresh();
    });

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New version</DialogTitle>
          <DialogDescription>
            A version is the shared WordPress build stores run on. Building it takes a few minutes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="version-name">Name</Label>
            <Input
              id="version-name"
              value={name}
              placeholder="v1.6"
              maxLength={30}
              disabled={pending}
              aria-invalid={!!nameError}
              onChange={(event) => setName(event.target.value.trim())}
            />
            {nameError && <p className="text-destructive text-xs">{nameError}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wordpress-version">WordPress version</Label>
              <Input
                id="wordpress-version"
                value={wordPressVersion}
                disabled={pending}
                onChange={(event) => setWordPressVersion(event.target.value.trim())}
              />
            </div>
            <div className="space-y-2">
              <Label>PHP version</Label>
              <Select value={phpVersion} onValueChange={setPhpVersion} disabled={pending}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PHP_VERSIONS.map((v) => (
                    <SelectItem key={v} value={v}>
                      PHP {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Start from</Label>
            <RadioGroup
              value={source}
              onValueChange={(value) => setSource(value as "template" | "upload")}
              disabled={pending}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="template" id="source-template" disabled={!baseTemplates.length} />
                <Label htmlFor="source-template" className="font-normal">
                  A base template
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="upload" id="source-upload" />
                <Label htmlFor="source-upload" className="font-normal">
                  Upload a site archive (.tar.gz or .zip, up to 4 GB)
                </Label>
              </div>
            </RadioGroup>
            {source === "template" ? (
              <Select value={templateId} onValueChange={setTemplateId} disabled={pending}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a template" />
                </SelectTrigger>
                <SelectContent>
                  {baseTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <ArchiveInput
                id="version-archive"
                accept=".gz,.tgz,.zip,application/gzip,application/zip"
                file={file}
                onFile={setFile}
                progress={progress}
                disabled={pending}
              />
            )}
          </div>

          {groupTemplates.length > 0 && (
            <div className="space-y-2">
              <Label>Copy group templates into it</Label>
              <div className="space-y-2 rounded-md border p-3">
                {groupTemplates.map((t) => (
                  <div key={t.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`copy-${t.id}`}
                      checked={copyIds.includes(t.id)}
                      disabled={pending}
                      onCheckedChange={(checked) =>
                        setUnchecked((ids) => (checked ? ids.filter((id) => id !== t.id) : [...ids, t.id]))
                      }
                    />
                    <Label htmlFor={`copy-${t.id}`} className="font-normal">
                      {t.name}
                      {t.groupName && <span className="text-muted-foreground">({t.groupName})</span>}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!ready || pending} onClick={submit}>
            {pending && <Spinner />}
            {source === "upload" ? "Create and upload" : "Create version"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
