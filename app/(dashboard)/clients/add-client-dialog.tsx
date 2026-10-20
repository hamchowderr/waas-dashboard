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
import { addClient } from "../actions";

const SIZES = [
  { value: "small", label: "Small (5 GB)" },
  { value: "medium", label: "Medium (10 GB)" },
  { value: "large", label: "Large (25 GB)" },
];

/** Adds a client in one step: AnyPress makes their account and site, then emails them an invitation. */
export function AddClientButton() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [size, setSize] = React.useState("small");
  const [pending, startTransition] = React.useTransition();

  const reset = () => {
    setName("");
    setEmail("");
    setSize("small");
  };
  const close = (next: boolean) => {
    if (pending) return;
    setOpen(next);
    if (!next) reset();
  };
  const ready = name.trim() !== "" && email.trim() !== "";

  const submit = () =>
    startTransition(async () => {
      const result = await addClient(name, email, size);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Setting up ${name.trim()}. They'll get an email when their site is ready.`);
      setOpen(false);
      reset();
      router.refresh();
    });

  return (
    <>
      <Button onClick={() => setOpen(true)}>Add client</Button>
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add client</DialogTitle>
            <DialogDescription>
              AnyPress makes their account and their site from the shop&apos;s
              template. When the site is ready, in a few minutes, they get an
              email to sign in. There&apos;s nothing else to do.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (ready) submit();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="client-name">Client or business name</Label>
              <Input
                id="client-name"
                value={name}
                maxLength={100}
                placeholder="Example Bakery"
                disabled={pending}
                autoComplete="off"
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-email">Their email</Label>
              <Input
                id="client-email"
                type="email"
                value={email}
                placeholder="owner@example.com"
                disabled={pending}
                autoComplete="off"
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-size">Site size</Label>
              <Select value={size} onValueChange={setSize} disabled={pending}>
                <SelectTrigger id="client-size" className="w-full">
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
            <Button variant="outline" disabled={pending} onClick={() => close(false)}>
              Cancel
            </Button>
            <Button disabled={pending || !ready} onClick={submit}>
              {pending && <Spinner />}
              Add client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
