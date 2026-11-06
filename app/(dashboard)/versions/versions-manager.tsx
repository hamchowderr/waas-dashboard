"use client";

import * as React from "react";
import { ArrowRightIcon, LayersIcon, MoreHorizontalIcon, PlusIcon, RocketIcon, StarIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { toast } from "sonner";

import type { Template, Version } from "@/lib/api/types";
import { StatusCode } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { parseTemplateContents } from "@/lib/template-contents";
import { EmptyState } from "@/components/admin/empty-state";
import { StatusBadge } from "@/components/admin/status-badge";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { PluginList } from "@/components/admin/plugin-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteTemplate, deleteVersion, setProductionVersion } from "../actions";
import { CreateVersionDialog } from "./create-version-dialog";
import { CreateTemplateDialog } from "./create-template-dialog";
import { useCanChange } from "@/components/auth/can-change";

/** Below sm the header's button moves under its text instead of squeezing it. */
const headerClass = "max-sm:has-data-[slot=card-action]:grid-cols-1";
const actionClass = "max-sm:col-start-1 max-sm:row-span-1 max-sm:row-start-auto max-sm:justify-self-start";

const tableClass =
  "[&_td:first-child]:ps-(--card-spacing) [&_td:last-child]:pe-(--card-spacing) [&_th:first-child]:ps-(--card-spacing) [&_th:last-child]:pe-(--card-spacing)";

type Pending =
  | { kind: "production"; version: Version }
  | { kind: "delete-version"; version: Version }
  | { kind: "delete-template"; template: Template }
  | null;

/** Runs an action and toasts its outcome; true on success. */
async function report(action: Promise<{ ok: true } | { ok: false; error: string }>, success: string) {
  const result = await action;
  if (result.ok) toast.success(success);
  else toast.error(result.error);
  return result.ok;
}

export function VersionsManager({
  productId,
  versions,
  templates
}: {
  productId: string;
  versions: Version[];
  templates: Template[];
}) {
  const canChange = useCanChange();
  const [pending, setPending] = React.useState<Pending>(null);
  const [creatingVersion, setCreatingVersion] = React.useState(false);
  const [creatingTemplate, setCreatingTemplate] = React.useState<"base" | "group" | null>(null);
  const production = versions.find((v) => v.isProduction);
  const sortedVersions = [...versions].sort(
    (a, b) => Number(b.isProduction) - Number(a.isProduction) || b.dateCreated.localeCompare(a.dateCreated)
  );
  const baseTemplates = templates.filter((t) => !t.isTenantSnapshot);
  const groupTemplates = templates.filter((t) => t.isTenantSnapshot);

  return (
    <>
      <HowItWorks templates={baseTemplates.length} versions={versions.length} production={production} />

      <div className="space-y-4 lg:space-y-6">
          <Card>
            <CardHeader className={headerClass}>
              <CardTitle>Versions</CardTitle>
              <CardDescription>
                {production
                  ? `New stores are created on ${production.name}, the production version.`
                  : "No production version yet: the storefront can't create stores until one is set."}
              </CardDescription>
              <CardAction className={actionClass}>
                <Button size="sm" onClick={() => setCreatingVersion(true)} disabled={!canChange}>
                  <PlusIcon /> New version
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="p-0">
              <Table className={tableClass}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="max-sm:hidden">Created</TableHead>
                    <TableHead className="w-12">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedVersions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="p-0">
                        <EmptyState icon={LayersIcon} title="No versions yet">
                          A version is the WordPress build this storefront&apos;s stores run on. Create the first one from a
                          template.
                        </EmptyState>
                      </TableCell>
                    </TableRow>
                  )}
                  {sortedVersions.map((version) => (
                    <TableRow key={version.id}>
                      <TableCell className="whitespace-normal">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{version.name}</span>
                          {version.isProduction && (
                            <Badge variant="success">
                              <StarIcon /> Production
                            </Badge>
                          )}
                        </div>
                        {/* The columns hidden on narrow screens, under the name instead. */}
                        <div className="text-muted-foreground mt-0.5 space-y-0.5 text-xs md:hidden">
                          <div className="sm:hidden">Created {formatDate(version.dateCreated)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge statusCode={version.statusCode} />
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap max-sm:hidden">
                        {formatDate(version.dateCreated)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild disabled={!canChange}>
                            <Button variant="ghost" size="icon-sm">
                              <span className="sr-only">Actions for {version.name}</span>
                              <MoreHorizontalIcon />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              disabled={version.isProduction || version.statusCode !== StatusCode.Done}
                              onSelect={() => setPending({ kind: "production", version })}>
                              <StarIcon /> Make production
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              disabled={version.isProduction || version.statusCode === StatusCode.Removing}
                              onSelect={() => setPending({ kind: "delete-version", version })}>
                              <Trash2Icon /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

        <div className="space-y-4 lg:space-y-6">
          <TemplatesCard
            title="Templates"
            description="The whole starting site: WordPress, the theme, plugins and starter pages. A new version is built from one of these."
            templates={baseTemplates}
            onAdd={canChange ? () => setCreatingTemplate("base") : undefined}
            onDelete={canChange ? (template) => setPending({ kind: "delete-template", template }) : undefined}
          />
          <TemplatesCard
            title="Plan starting points"
            description="Extra starting sites for one plan (its group name), copied into each version when it is built."
            templates={groupTemplates}
            onAdd={canChange ? () => setCreatingTemplate("group") : undefined}
            onDelete={canChange ? (template) => setPending({ kind: "delete-template", template }) : undefined}
          />
        </div>
      </div>

      <CreateVersionDialog
        open={creatingVersion}
        onOpenChange={setCreatingVersion}
        productId={productId}
        versionNames={versions.map((v) => v.name)}
        baseTemplates={baseTemplates}
        groupTemplates={groupTemplates}
      />
      <CreateTemplateDialog
        kind={creatingTemplate}
        onOpenChange={(open) => !open && setCreatingTemplate(null)}
        productId={productId}
      />

      <ConfirmAction
        open={pending?.kind === "production"}
        onOpenChange={(open) => !open && setPending(null)}
        title={pending?.kind === "production" ? `Make ${pending.version.name} the production version?` : ""}
        description={
          <>
            <p>
              New stores will be created on {pending?.kind === "production" ? pending.version.name : ""}, and the
              storefront will read its roles from it{production ? ` instead of ${production.name}` : ""}.
            </p>
            <p>Existing stores stay on the version they run on now.</p>
          </>
        }
        confirmLabel="Make production"
        onConfirm={() =>
          pending?.kind === "production"
            ? report(
                setProductionVersion(productId, pending.version.id),
                `${pending.version.name} is now the production version`
              )
            : Promise.resolve(false)
        }
      />
      <ConfirmAction
        open={pending?.kind === "delete-version"}
        onOpenChange={(open) => !open && setPending(null)}
        title={pending?.kind === "delete-version" ? `Delete version ${pending.version.name}?` : ""}
        description={
          <>
            <p>Its shared site is removed. This can&apos;t be undone.</p>
            <p>The API refuses if stores still run on it.</p>
          </>
        }
        confirmLabel="Delete version"
        destructive
        onConfirm={() =>
          pending?.kind === "delete-version"
            ? report(deleteVersion(productId, pending.version.id), `Removing ${pending.version.name}`)
            : Promise.resolve(false)
        }
      />
      <ConfirmAction
        open={pending?.kind === "delete-template"}
        onOpenChange={(open) => !open && setPending(null)}
        title={pending?.kind === "delete-template" ? `Delete template ${pending.template.name}?` : ""}
        description={<p>It is removed from this storefront. This can&apos;t be undone.</p>}
        confirmLabel="Delete template"
        destructive
        onConfirm={() =>
          pending?.kind === "delete-template"
            ? report(deleteTemplate(productId, pending.template.id), `${pending.template.name} deleted`)
            : Promise.resolve(false)
        }
      />
    </>
  );
}

function TemplatesCard({
  title,
  description,
  templates,
  onAdd,
  onDelete
}: {
  title: string;
  description: string;
  templates: Template[];
  onAdd?: () => void;
  /** Left out for someone who may only look. */
  onDelete?: (template: Template) => void;
}) {
  return (
    <Card>
      <CardHeader className={headerClass}>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {onAdd && (
          <CardAction className={actionClass}>
            <Button size="sm" onClick={onAdd}>
              <UploadIcon /> Upload template
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <Table className={tableClass}>
          <TableHeader>
            <TableRow>
              <TableHead>Template</TableHead>
              <TableHead className="max-sm:hidden">Group</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground h-16 text-center">
                  None yet.
                </TableCell>
              </TableRow>
            )}
            {templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell className="whitespace-normal">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-medium">{template.name}</span>
                    {template.isDefault && <Badge variant="outline">Default</Badge>}
                    {template.showAsBaseSnapshot && <Badge variant="info">Offered for first version</Badge>}
                  </div>
                  <TemplateDescription name={template.name} comment={template.comment} />
                  {template.groupName && (
                    <p className="text-muted-foreground text-xs sm:hidden">Group: {template.groupName}</p>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground max-sm:hidden">{template.groupName ?? "—"}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon-sm" onClick={() => onDelete?.(template)} disabled={!onDelete}>
                    <span className="sr-only">Delete {template.name}</span>
                    <Trash2Icon />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/** A template's description, with the build details it carries shown as its plugins rather than raw JSON. */
function TemplateDescription({ name, comment }: { name: string; comment: string }) {
  const contents = parseTemplateContents(comment);
  return (
    <>
      {contents.text && contents.text.toLowerCase() !== name.toLowerCase() && <p className="text-muted-foreground text-sm">{contents.text}</p>}
      <PluginList contents={contents} />
    </>
  );
}

/**
 * The three ideas on this page, left to right: a template (the starting site), the versions built from it, and the
 * one version new stores get (production).
 */
function HowItWorks({ templates, versions, production }: { templates: number; versions: number; production?: Version }) {
  const steps = [
    {
      icon: LayersIcon,
      label: "1. Template",
      value: `${templates} ${templates === 1 ? "template" : "templates"}`,
      text: "What a new site starts with: WordPress, the theme, the plugins and the starter pages."
    },
    {
      icon: UploadIcon,
      label: "2. Versions",
      value: `${versions} ${versions === 1 ? "version" : "versions"}`,
      text: "A saved build of a template. Make a new version after you change the template or its plugins."
    },
    {
      icon: RocketIcon,
      label: "3. Production",
      value: production ? production.name : "None yet",
      text: production ? "Every new store is copied from this version." : "Pick a version as production so new stores can be made."
    }
  ];
  return (
    <ol className="grid grid-cols-3 gap-2 md:gap-3 lg:gap-4">
      {steps.map((step, i) => (
        <li key={step.label} className="relative">
          <Card className="h-full gap-1 px-3 py-3 md:gap-2 md:px-(--card-spacing) md:py-(--card-spacing)">
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
              <step.icon className="size-4 max-md:hidden" aria-hidden />
              {step.label}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold md:text-lg">{step.value}</span>
            </div>
            <p className="text-muted-foreground text-sm max-md:hidden">{step.text}</p>
          </Card>
          {i < 2 && (
            <ArrowRightIcon
              aria-hidden
              className="text-muted-foreground bg-card absolute top-1/2 -right-3 z-10 hidden size-5 -translate-y-1/2 rounded-full border p-0.5 md:block lg:-right-3.5"
            />
          )}
        </li>
      ))}
    </ol>
  );
}
