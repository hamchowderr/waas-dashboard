"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { ImportCode } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { moveSiteIn } from "../actions";
import { ImportCodeSteps } from "./import-code";

const SIZES = [
  { value: "small", label: "Small (5 GB)" },
  { value: "medium", label: "Medium (10 GB)" },
  { value: "large", label: "Large (25 GB)" },
];

/**
 * Moves a WordPress site from another host into a new store. The store waits for the site; the
 * dialog then shows the import code and the plugin the site owner runs on the old site.
 */
export function MoveSiteIn({
  products,
}: {
  products: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [productId, setProductId] = React.useState(products[0]?.id ?? "");
  const [name, setName] = React.useState("");
  const [size, setSize] = React.useState("small");
  const [made, setMade] = React.useState<ImportCode | null>(null);
  const [pending, startTransition] = React.useTransition();

  const close = (next: boolean) => {
    if (pending) return;
    setOpen(next);
    if (!next) {
      if (made) router.refresh();
      setMade(null);
      setName("");
    }
  };

  const submit = () =>
    startTransition(async () => {
      const result = await moveSiteIn(productId, name, size);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setMade(result.data);
    });

  if (!products.length) return null;

  return (
    <>
      <Button onClick={() => setOpen(true)}>Move a site in</Button>
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {made ? "Send the site over" : "Move a site in"}
            </DialogTitle>
            <DialogDescription>
              {made
                ? "The store is waiting for the site. Give the site owner these steps, or do them yourself."
                : "Brings a WordPress site from another host into a new store. It keeps its own plugins, themes, content and users."}
            </DialogDescription>
          </DialogHeader>
          {made ? (
            <ImportCodeSteps code={made} />
          ) : (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (name.trim()) submit();
              }}
            >
              {products.length > 1 && (
                <div className="space-y-2">
                  <Label htmlFor="move-storefront">Storefront</Label>
                  <Select
                    value={productId}
                    onValueChange={setProductId}
                    disabled={pending}
                  >
                    <SelectTrigger id="move-storefront" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="move-name">Store name</Label>
                <Input
                  id="move-name"
                  value={name}
                  maxLength={30}
                  placeholder="Example Bakery"
                  disabled={pending}
                  autoComplete="off"
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="move-size">Size</Label>
                <Select value={size} onValueChange={setSize} disabled={pending}>
                  <SelectTrigger id="move-size" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SIZES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  The site&apos;s files and database must fit in the
                  store&apos;s storage.
                </p>
              </div>
            </form>
          )}
          <DialogFooter>
            {made ? (
              <>
                <Button variant="outline" asChild>
                  <Link href={`/stores/${made.tenantId}`}>Open the store</Link>
                </Button>
                <Button onClick={() => close(false)}>Done</Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  disabled={pending}
                  onClick={() => close(false)}
                >
                  Cancel
                </Button>
                <Button
                  disabled={pending || !name.trim() || !productId}
                  onClick={submit}
                >
                  {pending && <Spinner />}
                  Make the store
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
