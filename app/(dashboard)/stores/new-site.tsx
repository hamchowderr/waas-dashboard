"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
import { createStore } from "../actions";

const SIZES = [
  { value: "small", label: "Small (5 GB)" },
  { value: "medium", label: "Medium (10 GB)" },
  { value: "large", label: "Large (25 GB)" },
];

/**
 * Makes a new store of a storefront from its production version and latest template, then opens
 * it while it builds. For a store that isn't bought on the storefront, such as a test store or a site you give away.
 */
export function NewSite({
  products,
}: {
  products: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [productId, setProductId] = React.useState(products[0]?.id ?? "");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [size, setSize] = React.useState("small");
  const [pending, startTransition] = React.useTransition();

  const close = (next: boolean) => {
    if (pending) return;
    setOpen(next);
    if (!next) {
      setName("");
      setEmail("");
    }
  };

  const submit = () =>
    startTransition(async () => {
      const result = await createStore(productId, name, email, size);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("The site is being built");
      setOpen(false);
      setName("");
      setEmail("");
      router.push(`/stores/${result.data.tenantId}`);
    });

  if (!products.length) return null;

  return (
    <>
      <Button onClick={() => setOpen(true)}>New site</Button>
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New site</DialogTitle>
            <DialogDescription>
              Builds a new site from the storefront&apos;s current version and
              template. It is ready in a few minutes.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (name.trim() && email.trim()) submit();
            }}
          >
            {products.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="new-site-storefront">Storefront</Label>
                <Select
                  value={productId}
                  onValueChange={setProductId}
                  disabled={pending}
                >
                  <SelectTrigger id="new-site-storefront" className="w-full">
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
              <Label htmlFor="new-site-name">Site name</Label>
              <Input
                id="new-site-name"
                value={name}
                maxLength={30}
                placeholder="Example Bakery"
                disabled={pending}
                autoComplete="off"
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-site-email">Owner email</Label>
              <Input
                id="new-site-email"
                type="email"
                value={email}
                maxLength={254}
                placeholder="owner@example.com"
                disabled={pending}
                autoComplete="off"
                aria-describedby="new-site-email-help"
                onChange={(event) => setEmail(event.target.value)}
              />
              <p id="new-site-email-help" className="text-muted-foreground text-sm">
                They sign in to the site with this email.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-site-size">Size</Label>
              <Select value={size} onValueChange={setSize} disabled={pending}>
                <SelectTrigger id="new-site-size" className="w-full">
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
            </div>
          </form>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => close(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={pending || !name.trim() || !email.trim() || !productId}
              onClick={submit}
            >
              {pending && <Spinner />}
              Build the site
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
