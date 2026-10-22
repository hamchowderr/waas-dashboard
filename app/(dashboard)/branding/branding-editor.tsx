"use client";

import * as React from "react";
import { ImageIcon, ServerCogIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { toast } from "sonner";

import type { BrandImage, Branding, BrandingView, TeamOf } from "@/lib/api/types";
import { BRAND_IMAGE_LIMITS, BRAND_IMAGE_TYPES, brandColorVars } from "@/lib/branding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { removeBrandImage, saveBranding, uploadBrandImage } from "../actions";

type Form = { name: string; color: string; supportEmail: string };

const toForm = (b: Branding): Form => ({ name: b.name ?? "", color: b.color ?? "", supportEmail: b.supportEmail ?? "" });

const IMAGES: { kind: BrandImage; title: string; about: string; key: "logoUrl" | "iconUrl" }[] = [
  { kind: "logo", key: "logoUrl", title: "Logo", about: "Shown at the top of the sidebar and on the sign-in page. PNG, JPEG or WebP, up to 256 KB. A square or wide logo on a clear background works best." },
  { kind: "icon", key: "iconUrl", title: "Icon", about: "The small picture on the browser tab. A square PNG or .ico, up to 64 KB." }
];

/**
 * A storefront's branding, or with a reseller `of` the reseller's, which fills whatever its
 * storefronts leave empty. `inherits` names where empty fields come from, when anywhere.
 */
export function BrandingEditor({
  of,
  initial,
  canEdit,
  inherits,
  brandName
}: {
  of: TeamOf;
  initial: BrandingView;
  canEdit: boolean;
  inherits?: string;
  /** A reseller's brand name from its settings. The dashboard name falls back to it, so the name isn't asked twice. */
  brandName?: string | null;
}) {
  const [view, setView] = React.useState(initial);
  const [form, setForm] = React.useState(() => toForm(initial));
  const [pending, startTransition] = React.useTransition();
  const [busyImage, setBusyImage] = React.useState<BrandImage | null>(null);
  const changed = JSON.stringify(toForm(view)) !== JSON.stringify(form);
  const colorValid = !form.color || /^#[0-9a-f]{6}$/i.test(form.color);

  const applied = (next: BrandingView) => {
    setView(next);
    setForm(toForm(next));
  };

  const save = () =>
    startTransition(async () => {
      const result = await saveBranding(of, {
        name: form.name.trim() || null,
        color: form.color.trim() || null,
        supportEmail: form.supportEmail.trim() || null
      });
      if (!result.ok) return void toast.error(result.error);
      applied(result.data);
      toast.success("Saved");
    });

  const upload = async (kind: BrandImage, file: File) => {
    if (file.type && !BRAND_IMAGE_TYPES[kind].includes(file.type)) return void toast.error("Choose a PNG, JPEG or WebP image" + (kind === "icon" ? ", or an .ico file" : ""));
    if (file.size > BRAND_IMAGE_LIMITS[kind]) return void toast.error(`The ${kind} must be at most ${BRAND_IMAGE_LIMITS[kind] / 1024} KB`);
    setBusyImage(kind);
    const data = new FormData();
    data.set("kind", kind);
    data.set("file", file);
    const result = await uploadBrandImage(of, data);
    setBusyImage(null);
    if (!result.ok) return void toast.error(result.error);
    setView(result.data);
    toast.success(kind === "logo" ? "Logo saved" : "Icon saved");
  };

  const remove = async (kind: BrandImage) => {
    setBusyImage(kind);
    const result = await removeBrandImage(of, kind);
    setBusyImage(null);
    if (!result.ok) return void toast.error(result.error);
    setView(result.data);
  };

  const fromParent = (own: string | null, shown: string | null) => (inherits && !own && shown ? `From ${inherits}: ${shown}` : undefined);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Name, color and help</CardTitle>
            <CardDescription>
              What your team sees in place of AnyPress. Leave a field empty to keep {inherits ? `${inherits}'s` : "the standard"} look.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {brandName !== undefined && !initial.name ? (
              <div className="space-y-1 text-sm">
                <div className="font-medium">Name</div>
                <p className="text-muted-foreground">
                  {brandName ? `${brandName}, the brand name in Settings.` : "AnyPress until a brand name is set in Settings."}
                </p>
              </div>
            ) : (
            <div className="space-y-2">
              <Label htmlFor="brand-name">Name</Label>
              <Input
                id="brand-name"
                maxLength={60}
                value={form.name}
                disabled={!canEdit}
                placeholder={fromParent(view.name, view.shown.name) ?? "Your business name"}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="brand-color">Main color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Pick the main color"
                  className="h-9 w-12 shrink-0 cursor-pointer rounded-md border bg-transparent p-1 disabled:cursor-not-allowed"
                  value={colorValid && form.color ? form.color : (view.shown.color ?? "#171717")}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                />
                <Input
                  id="brand-color"
                  className="max-w-40 font-mono"
                  maxLength={7}
                  value={form.color}
                  disabled={!canEdit}
                  placeholder={view.shown.color && !view.color ? view.shown.color : "#1d4ed8"}
                  aria-invalid={!colorValid}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                />
                {form.color && canEdit && (
                  <Button variant="ghost" size="sm" onClick={() => setForm({ ...form, color: "" })}>
                    Clear
                  </Button>
                )}
              </div>
              <p className="text-muted-foreground text-xs">Buttons, links and the selected page in the sidebar.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-support">Support email</Label>
              <Input
                id="brand-support"
                type="email"
                maxLength={254}
                value={form.supportEmail}
                disabled={!canEdit}
                placeholder={fromParent(view.supportEmail, view.shown.supportEmail) ?? "help@yourbusiness.com"}
                onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
              />
              <p className="text-muted-foreground text-xs">Shown at the bottom of the sidebar, so your team knows who to ask.</p>
            </div>
            {canEdit && (
              <Button size="sm" disabled={!changed || !colorValid || pending} onClick={save}>
                {pending && <Spinner />}
                Save
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          {IMAGES.map((image) => {
            const own = view[image.key];
            const shown = view.shown[image.key];
            return (
              <Card key={image.kind}>
                <CardHeader>
                  <CardTitle>{image.title}</CardTitle>
                  <CardDescription>{image.about}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-muted/40 flex h-24 items-center justify-center rounded-md border">
                    {shown ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={shown} alt={`${image.title} preview`} className="max-h-16 max-w-[80%] object-contain" />
                    ) : (
                      <ImageIcon className="text-muted-foreground size-6" />
                    )}
                  </div>
                  {!own && shown && inherits && <p className="text-muted-foreground text-xs">Using {inherits}&apos;s {image.kind}.</p>}
                  {canEdit && (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" asChild disabled={busyImage !== null}>
                        <label className="cursor-pointer">
                          {busyImage === image.kind ? <Spinner /> : <UploadIcon />}
                          {own ? "Replace" : "Upload"}
                          <input
                            type="file"
                            className="sr-only"
                            accept={BRAND_IMAGE_TYPES[image.kind].join(",") + (image.kind === "icon" ? ",.ico" : "")}
                            disabled={busyImage !== null}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = "";
                              if (file) void upload(image.kind, file);
                            }}
                          />
                        </label>
                      </Button>
                      {own && (
                        <Button variant="ghost" size="sm" disabled={busyImage !== null} onClick={() => void remove(image.kind)}>
                          <Trash2Icon />
                          Remove
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>How the top of the sidebar looks to your team.</CardDescription>
        </CardHeader>
        <CardContent>
          <BrandPreview brand={view.shown} />
        </CardContent>
      </Card>
    </div>
  );
}

function BrandPreview({ brand }: { brand: Branding }) {
  return (
    <div className="bg-sidebar space-y-3 rounded-md border p-3" style={brandColorVars(brand.color ?? "#171717") as React.CSSProperties}>
      <div className="flex items-center gap-2">
        {brand.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brand.logoUrl} alt="" className="h-8 max-w-28 object-contain" />
        ) : (
          <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-[5px]">
            <ServerCogIcon className="size-4" />
          </span>
        )}
        <span className="truncate font-semibold">{brand.name ?? "AnyPress"}</span>
      </div>
      <div className="bg-sidebar-accent text-sidebar-accent-foreground rounded-md px-2 py-1.5 text-sm">Overview</div>
      <div className="px-2 text-sm">Stores</div>
      <Button size="sm" className="w-full">
        A button
      </Button>
      {brand.name && <p className="text-muted-foreground text-center text-[11px]">Powered by AnyPress</p>}
    </div>
  );
}
