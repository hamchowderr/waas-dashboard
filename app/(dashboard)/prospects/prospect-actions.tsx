"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CopyIcon, ExternalLinkIcon, MoreHorizontalIcon, PlusIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import type { ProspectRoute } from "@/lib/api/types";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { NEW_SITE_TYPES, siteTypeOf } from "@/components/admin/site-type";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { addProspectDemo, deleteProspectDemo, gatherProspectDemo } from "../actions";
import { ROUTE_LABELS } from "./routes";

const EMPTY = { company: "", website: "", route: "owner" as ProspectRoute, siteType: "website", city: "", label: "" };

/** Adds one business; its website is read in the background and the demo is ready a minute later. */
export function AddProspect() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY);
  const [pending, startTransition] = React.useTransition();
  const set = (key: keyof typeof EMPTY) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const add = () =>
    startTransition(async () => {
      const result = await addProspectDemo(form);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (!result.data.added) {
        toast.warning(result.data.reason ?? "Already on the list");
        return;
      }
      toast.success(form.website.trim() ? `Added. Reading ${form.company}'s website now.` : "Added.");
      setForm(EMPTY);
      setOpen(false);
      router.refresh();
    });

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusIcon />
        Add Prospect
      </Button>
      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Prospect</DialogTitle>
            <DialogDescription>
              We read their website once for the name, colours, logo, photos and menu, and make a demo in their brand.
            </DialogDescription>
          </DialogHeader>
          <form
            id="add-prospect"
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              add();
            }}>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="prospect-company">Business name</Label>
              <Input id="prospect-company" required value={form.company} disabled={pending} onChange={(e) => set("company")(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="prospect-website">Website</Label>
              <Input
                id="prospect-website"
                value={form.website}
                placeholder="example.com"
                disabled={pending}
                autoComplete="off"
                onChange={(e) => set("website")(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prospect-route">How they&apos;d use AnyPress</Label>
              <Select value={form.route} onValueChange={set("route")} disabled={pending}>
                <SelectTrigger id="prospect-route" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROUTE_LABELS) as ProspectRoute[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROUTE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prospect-type">Site type</Label>
              <Select value={form.siteType} onValueChange={set("siteType")} disabled={pending}>
                <SelectTrigger id="prospect-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NEW_SITE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {siteTypeOf([type]).label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prospect-city">City</Label>
              <Input id="prospect-city" value={form.city} disabled={pending} onChange={(e) => set("city")(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prospect-label">Group</Label>
              <Input id="prospect-label" value={form.label} placeholder="Web studio" disabled={pending} onChange={(e) => set("label")(e.target.value)} />
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="add-prospect" disabled={pending || !form.company.trim()}>
              {pending && <Spinner />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Open or copy the demo link, read the website again, or remove the prospect. */
export function ProspectRowActions({ id, company, demoUrl, canRead }: { id: string; company: string; demoUrl: string | null; canRead: boolean }) {
  const router = useRouter();
  const [removing, setRemoving] = React.useState(false);

  const copy = async () => {
    if (!demoUrl) return;
    await navigator.clipboard.writeText(demoUrl);
    toast.success("Demo link copied.");
  };
  const readAgain = async () => {
    const result = await gatherProspectDemo(id);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success(`Reading ${company}'s website again.`);
      router.refresh();
    }
  };
  const remove = async () => {
    const result = await deleteProspectDemo(id);
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    toast.success("Removed.");
    router.refresh();
    return true;
  };

  return (
    <div className="flex items-center justify-end gap-1">
      {demoUrl && (
        <Button variant="outline" size="sm" asChild>
          <a href={demoUrl} target="_blank" rel="noreferrer">
            <ExternalLinkIcon />
            <span className="max-md:sr-only">Open</span>
          </a>
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`More for ${company}`}>
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled={!demoUrl} onSelect={copy}>
            <CopyIcon />
            Copy Demo Link
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!canRead} onSelect={readAgain}>
            <RefreshCwIcon />
            Read Website Again
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setRemoving(true)}>
            <Trash2Icon />
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmAction
        open={removing}
        onOpenChange={setRemoving}
        title={`Remove ${company}?`}
        description="Their demo link stops working and the images copied from their website are deleted."
        confirmLabel="Remove"
        destructive
        onConfirm={remove}
      />
    </div>
  );
}
