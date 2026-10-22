"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpCircleIcon, LayersIcon, PencilIcon, PlusIcon, PowerOffIcon, SearchIcon, StarIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import type { DirectoryPlugin, PluginChoice, PluginChoiceInput } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { installsLabel, SITE_TYPES, siteTypesLabel, TEMPLATE_PLUGINS } from "@/lib/plugin-choices";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { PluginIcon } from "@/components/admin/plugin-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { removePluginChoice, searchPlugins, setPluginChoice } from "../actions";

/** Below sm the header's button moves under its text instead of squeezing it. */
const headerClass = "max-sm:has-data-[slot=card-action]:grid-cols-1";
const actionClass = "max-sm:col-start-1 max-sm:row-span-1 max-sm:row-start-auto max-sm:justify-self-start";

/** What the site types dialog is choosing for. */
type Editing = { slug: string; name: string; icon: string | null; action: "add" | "off"; siteTypes: string[]; version?: string } | null;

export function PluginChoicesManager({ productId, choices }: { productId: string; choices: PluginChoice[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<Editing>(null);
  const [removing, setRemoving] = React.useState<PluginChoice | null>(null);
  const [updating, setUpdating] = React.useState<string | null>(null);
  const bySlug = new Map(choices.map((c) => [c.slug, c]));
  const added = choices.filter((c) => c.action === "add");
  const waiting = choices.filter((c) => !c.inProduction).length;

  async function save(slug: string, input: PluginChoiceInput, success: string) {
    const result = await setPluginChoice(productId, slug, input);
    if (result.ok) {
      toast.success(success);
      router.refresh();
    } else toast.error(result.error);
    return result.ok;
  }

  return (
    <>
      {waiting > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-orange-400 bg-orange-50 px-4 py-3 text-sm text-orange-900 dark:bg-orange-900/40 dark:text-white/85">
          <LayersIcon className="size-4 shrink-0" />
          <p className="min-w-0 flex-1">
            {waiting === 1 ? "1 change isn't" : `${waiting} changes aren't`} in your stores yet. Build a new version and make it
            production, and your stores get them when they move to it.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href={`/versions?product=${productId}`}>Versions</Link>
          </Button>
        </div>
      )}

      <Card>
        <CardHeader className={headerClass}>
          <CardTitle>Your plugins</CardTitle>
          <CardDescription>
            Plugins your stores get on top of the template, and template plugins you switch off. Each one is pinned to a
            version, so every store runs the same code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {choices.length === 0 ? (
            <p className="text-muted-foreground text-sm">No plugins added yet. Search wordpress.org below to add one.</p>
          ) : (
            <ul className="divide-y">
              {choices.map((choice) => (
                <li key={choice.slug} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <PluginIcon slug={choice.slug} name={choice.name} icon={choice.icon} className="size-10" />
                  {/* At least 12rem, so on a phone the buttons go under it instead of squeezing it. */}
                  <div className="min-w-48 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {choice.name}
                      {choice.version && <span className="text-muted-foreground text-xs tabular-nums">{choice.version}</span>}
                      {choice.action === "off" && <Badge variant="secondary">Switched off</Badge>}
                      {choice.shared && <Badge variant="outline">From your reseller</Badge>}
                      {!choice.inProduction && <Badge variant="warning">Not in a version yet</Badge>}
                    </p>
                    <p className="text-muted-foreground text-sm">{siteTypesLabel(choice.siteTypes)}</p>
                  </div>
                  {!choice.shared && (
                    <div className="flex flex-wrap gap-2">
                      {choice.action === "add" && choice.latestVersion && choice.latestVersion !== choice.version && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updating === choice.slug}
                          onClick={async () => {
                            setUpdating(choice.slug);
                            await save(choice.slug, { action: "add", siteTypes: choice.siteTypes }, `${choice.name} moves to ${choice.latestVersion} in your next version`);
                            setUpdating(null);
                          }}>
                          {updating === choice.slug ? <Spinner /> : <ArrowUpCircleIcon />}
                          Update to {choice.latestVersion}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Site types for ${choice.name}`}
                        onClick={() => setEditing({ ...choice, version: choice.version ?? undefined })}>
                        <PencilIcon />
                      </Button>
                      <Button size="sm" variant="ghost" aria-label={`Remove ${choice.name}`} onClick={() => setRemoving(choice)}>
                        <Trash2Icon />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className={headerClass}>
          <CardTitle>Template plugins</CardTitle>
          <CardDescription>What the AnyPress template comes with. Switch off the ones your stores don&apos;t need.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-wrap gap-2">
            {TEMPLATE_PLUGINS.map((plugin) => {
              const off = bySlug.get(plugin.slug)?.action === "off";
              return (
                <li key={plugin.slug}>
                  <button
                    type="button"
                    className="hover:bg-muted/60 flex items-center gap-2 rounded-md border py-1 ps-1 pe-2.5 text-sm transition-colors disabled:cursor-default"
                    disabled={bySlug.has(plugin.slug)}
                    title={off ? "Switched off" : `Switch off ${plugin.name}`}
                    onClick={() => setEditing({ slug: plugin.slug, name: plugin.name, icon: null, action: "off", siteTypes: [] })}>
                    <PluginIcon slug={plugin.slug} name={plugin.name} />
                    <span className={off ? "text-muted-foreground line-through" : undefined}>{plugin.name}</span>
                    {!bySlug.has(plugin.slug) && <PowerOffIcon className="text-muted-foreground size-3.5" aria-hidden={true} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <DirectorySearch
        productId={productId}
        chosen={bySlug}
        full={added.filter((c) => !c.shared).length >= 25}
        onAdd={(plugin) => setEditing({ slug: plugin.slug, name: plugin.name, icon: plugin.icon, action: "add", siteTypes: [] })}
      />

      <SiteTypesDialog
        editing={editing}
        onOpenChange={(open) => !open && setEditing(null)}
        onSave={(e, siteTypes) =>
          save(
            e.slug,
            { action: e.action, siteTypes, ...(e.version && { version: e.version }) },
            e.action === "off" ? `${e.name} will be switched off in your next version` : `${e.name} will be in your next version`
          )
        }
      />

      <ConfirmAction
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Remove ${removing?.name ?? "plugin"}?`}
        description={
          removing?.action === "off"
            ? "Your next version has it as the template does."
            : "Your next version leaves it out. Stores keep it until they move to that version."
        }
        confirmLabel="Remove"
        destructive
        onConfirm={async () => {
          const result = await removePluginChoice(productId, removing!.slug);
          if (result.ok) {
            toast.success(`${removing!.name} removed`);
            router.refresh();
          } else toast.error(result.error);
          return result.ok;
        }}
      />
    </>
  );
}

/** wordpress.org's own plugin search, as cards with each plugin's icon and name. */
function DirectorySearch({
  productId,
  chosen,
  full,
  onAdd
}: {
  productId: string;
  chosen: Map<string, PluginChoice>;
  full: boolean;
  onAdd: (plugin: DirectoryPlugin) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<{ query: string; plugins: DirectoryPlugin[]; page: number; pages: number } | null>(null);
  const [pending, startTransition] = React.useTransition();

  function search(page = 1) {
    const q = query.trim();
    if (q.length < 2) return;
    startTransition(async () => {
      const result = await searchPlugins(productId, q, page);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setResults((before) => ({
        query: q,
        page: result.data.page,
        pages: result.data.pages,
        plugins: page > 1 && before?.query === q ? [...before.plugins, ...result.data.plugins] : result.data.plugins
      }));
    });
  }

  return (
    <Card>
      <CardHeader className={headerClass}>
        <CardTitle>Add from wordpress.org</CardTitle>
        <CardDescription>
          Search the free plugins on wordpress.org. Plugins that clash with the hosting (caching, backups, email sending)
          can&apos;t be added.
        </CardDescription>
        {full && (
          <CardAction className={actionClass}>
            <Badge variant="warning">25 plugins added: the most a storefront can have</Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            search();
          }}>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search plugins, like forms, events or SEO"
            aria-label="Search wordpress.org plugins"
            maxLength={100}
          />
          <Button type="submit" disabled={pending || query.trim().length < 2}>
            {pending ? <Spinner /> : <SearchIcon />}
            Search
          </Button>
        </form>

        {results && results.plugins.length === 0 && (
          <p className="text-muted-foreground text-sm">Nothing on wordpress.org matches &ldquo;{results.query}&rdquo;.</p>
        )}
        {results && results.plugins.length > 0 && (
          <>
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {results.plugins.map((plugin) => {
                const choice = chosen.get(plugin.slug);
                return (
                  <li key={plugin.slug} className="flex flex-col gap-3 rounded-lg border p-3">
                    <div className="flex gap-3">
                      <PluginIcon slug={plugin.slug} name={plugin.name} icon={plugin.icon} className="size-12" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium" title={plugin.name}>
                          {plugin.name}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">by {plugin.author}</p>
                        <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          <span className="flex items-center gap-1">
                            <StarIcon className="size-3" aria-hidden={true} />
                            {(plugin.rating / 20).toFixed(1)}
                          </span>
                          <span>{installsLabel(plugin.activeInstalls)} installs</span>
                        </p>
                      </div>
                    </div>
                    <p className="text-muted-foreground line-clamp-2 text-sm">{plugin.shortDescription}</p>
                    <div className="mt-auto flex items-center gap-2">
                      <p className="text-muted-foreground min-w-0 flex-1 text-xs">
                        {plugin.version}
                        {plugin.lastUpdated && ` · updated ${formatDate(plugin.lastUpdated)}`}
                        {plugin.testedUpTo && ` · tested up to WordPress ${plugin.testedUpTo}`}
                      </p>
                      {plugin.blocked ? (
                        <Badge variant="secondary" title={plugin.blocked}>
                          Not allowed
                        </Badge>
                      ) : choice ? (
                        <Badge variant={choice.action === "add" ? "success" : "secondary"}>{choice.action === "add" ? "Added" : "Switched off"}</Badge>
                      ) : (
                        <Button size="sm" variant="outline" disabled={full} onClick={() => onAdd(plugin)}>
                          <PlusIcon />
                          Add
                        </Button>
                      )}
                    </div>
                    {plugin.blocked && <p className="text-muted-foreground text-xs">{plugin.blocked}</p>}
                  </li>
                );
              })}
            </ul>
            {results.page < results.pages && (
              <Button variant="outline" className="w-full" disabled={pending} onClick={() => search(results.page + 1)}>
                {pending && <Spinner />}
                More plugins
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** Which site types a plugin is added to, or switched off for. */
function SiteTypesDialog({
  editing,
  onOpenChange,
  onSave
}: {
  editing: Editing;
  onOpenChange: (open: boolean) => void;
  onSave: (editing: NonNullable<Editing>, siteTypes: string[]) => Promise<boolean>;
}) {
  const [pending, startTransition] = React.useTransition();
  return (
    <Dialog open={editing !== null} onOpenChange={(open) => !pending && onOpenChange(open)}>
      <DialogContent>
        {editing && (
          // Keyed, so each plugin opens with its own site types.
          <SiteTypesForm
            key={`${editing.action}:${editing.slug}`}
            editing={editing}
            pending={pending}
            onCancel={() => onOpenChange(false)}
            onSave={(siteTypes) =>
              startTransition(async () => {
                if (await onSave(editing, siteTypes)) onOpenChange(false);
              })
            }
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SiteTypesForm({
  editing,
  pending,
  onCancel,
  onSave
}: {
  editing: NonNullable<Editing>;
  pending: boolean;
  onCancel: () => void;
  onSave: (siteTypes: string[]) => void;
}) {
  const [all, setAll] = React.useState(editing.siteTypes.length === 0);
  const [picked, setPicked] = React.useState(() =>
    SITE_TYPES.filter((t) => t.keys.some((k) => editing.siteTypes.includes(k))).map((t) => t.label)
  );
  const keys = SITE_TYPES.filter((t) => picked.includes(t.label)).flatMap((t) => t.keys);
  const off = editing.action === "off";

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <PluginIcon slug={editing.slug} name={editing.name} icon={editing.icon} className="size-8" />
          {off ? `Switch off ${editing.name}` : editing.name}
        </DialogTitle>
        <DialogDescription>
          {off
            ? "Which stores leave it switched off? It stays installed, so you can turn it back on later."
            : "Which stores get it? It is pinned to its current version until you update it here."}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <Label className="flex items-center gap-3 font-normal">
          <Checkbox checked={all} onCheckedChange={(value) => setAll(value === true)} />
          All site types
        </Label>
        {!all && (
          <div className="grid gap-2 ps-7 sm:grid-cols-2">
            {SITE_TYPES.map((type) => (
              <Label key={type.label} className="flex items-center gap-3 font-normal">
                <Checkbox
                  checked={picked.includes(type.label)}
                  onCheckedChange={(value) =>
                    setPicked((before) => (value === true ? [...before, type.label] : before.filter((l) => l !== type.label)))
                  }
                />
                {type.label}
              </Label>
            ))}
          </div>
        )}
        <p className="text-muted-foreground text-xs">Your stores get the change once you build a new version and make it production.</p>
      </div>
      <DialogFooter>
        <Button variant="outline" disabled={pending} onClick={onCancel}>
          Cancel
        </Button>
        <Button disabled={pending || (!all && keys.length === 0)} onClick={() => onSave(all ? [] : keys)}>
          {pending && <Spinner />}
          {off ? "Switch off" : "Save"}
        </Button>
      </DialogFooter>
    </>
  );
}
