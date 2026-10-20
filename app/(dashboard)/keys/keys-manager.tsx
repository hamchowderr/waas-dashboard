"use client";

import * as React from "react";
import {
  BanIcon,
  MoreHorizontalIcon,
  PlusIcon,
  RefreshCwIcon,
} from "lucide-react";
import { toast } from "sonner";

import type { ApiKey, ApiKeyState } from "@/lib/api/types";
import { formatAgo, formatDate, formatDateTime } from "@/lib/format";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createApiKey,
  createPartnerKey,
  revokeApiKey,
  revokePartnerKey,
  rotateApiKey,
  rotatePartnerKey,
} from "../actions";
import { SecretDialog } from "./secret-dialog";

/** Below sm the header's button moves under its text instead of squeezing it. */
const headerClass = "max-sm:has-data-[slot=card-action]:grid-cols-1";
const actionClass =
  "max-sm:col-start-1 max-sm:row-span-1 max-sm:row-start-auto max-sm:justify-self-start";

const tableClass =
  "[&_td:first-child]:ps-(--card-spacing) [&_td:last-child]:pe-(--card-spacing) [&_th:first-child]:ps-(--card-spacing) [&_th:last-child]:pe-(--card-spacing)";

const stateMeta: Record<
  ApiKeyState,
  { label: string; badge: "success" | "warning" | "secondary" }
> = {
  active: { label: "Active", badge: "success" },
  expiring: { label: "Expiring", badge: "warning" },
  revoked: { label: "Revoked", badge: "secondary" },
};

/** How long a rotated key keeps working, so whatever uses it can switch over. */
const graceOptions = [
  { hours: 0, label: "Stop it now" },
  { hours: 1, label: "1 hour" },
  { hours: 24, label: "24 hours" },
  { hours: 168, label: "7 days" },
];

type Shown = {
  title: string;
  keyId: string;
  secret: string;
  note?: string;
  usage?: string;
} | null;

const keyName = (key: ApiKey) => key.label ?? `Key ${key.id.slice(0, 8)}`;

/**
 * A storefront's API keys or, with `partner`, a reseller's partner keys (productId is then the
 * reseller's id): the same list, with the reseller's actions.
 */
export function KeysManager({
  productId,
  productName,
  keys,
  partner = false,
}: {
  productId: string;
  productName: string;
  keys: ApiKey[];
  partner?: boolean;
}) {
  const [creating, setCreating] = React.useState(false);
  const [label, setLabel] = React.useState("");
  const [rotating, setRotating] = React.useState<ApiKey | null>(null);
  const [grace, setGrace] = React.useState("24");
  const [revoking, setRevoking] = React.useState<ApiKey | null>(null);
  const [shown, setShownState] = React.useState<Shown>(null);
  const setShown = (next: Shown) =>
    setShownState(
      next && partner
        ? {
            ...next,
            usage:
              "Give these to the partner for their own app. A partner key isn't entered on a storefront: each call names the storefront with ?productId=.",
          }
        : next,
    );
  const [pending, startTransition] = React.useTransition();
  const activeCount = keys.filter((k) => k.state === "active").length;
  const actions = partner
    ? { create: createPartnerKey, rotate: rotatePartnerKey, revoke: revokePartnerKey }
    : { create: createApiKey, rotate: rotateApiKey, revoke: revokeApiKey };

  const create = () =>
    startTransition(async () => {
      const result = await actions.create(productId, label);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setCreating(false);
      setLabel("");
      setShown({
        title: partner ? "New partner key" : "New API key",
        keyId: result.data.id,
        secret: result.data.secret,
      });
    });

  const rotate = () =>
    startTransition(async () => {
      if (!rotating) return;
      const hours = Number(grace);
      const result = await actions.rotate(productId, rotating.id, hours);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const option = graceOptions.find((o) => o.hours === hours);
      setRotating(null);
      setShown({
        title: `${keyName(rotating)} rotated`,
        keyId: result.data.id,
        secret: result.data.secret,
        note:
          hours > 0
            ? `The old key keeps working for ${option?.label ?? `${hours} hours`}.`
            : "The old key has stopped working.",
      });
    });

  return (
    <>
      <Card>
        <CardHeader className={headerClass}>
          <CardTitle>{partner ? "Partner keys" : "Keys"}</CardTitle>
          <CardDescription>
            {partner
              ? "One key for every storefront in this account: each API call names the storefront with ?productId=. Secrets are shown once."
              : activeCount === 0
                ? "No active key: the storefront can't reach the API."
                : `${activeCount} active ${activeCount === 1 ? "key" : "keys"}. Secrets are shown once, when a key is created.`}
          </CardDescription>
          <CardAction className={actionClass}>
            <Button size="sm" onClick={() => setCreating(true)}>
              <PlusIcon /> New key
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="p-0">
          <Table className={tableClass}>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>State</TableHead>
                <TableHead className="max-md:hidden">Last used</TableHead>
                <TableHead className="max-sm:hidden">Created</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-muted-foreground h-20 text-center"
                  >
                    No keys yet.
                  </TableCell>
                </TableRow>
              )}
              {keys.map((key) => (
                <TableRow
                  key={key.id}
                  className={
                    key.state === "revoked"
                      ? "text-muted-foreground"
                      : undefined
                  }
                >
                  <TableCell className="whitespace-normal">
                    <div className="font-medium">{keyName(key)}</div>
                    <code className="text-muted-foreground text-xs break-all">
                      {key.id}
                    </code>
                    <div className="text-muted-foreground mt-0.5 text-xs md:hidden">
                      Last used{" "}
                      {key.lastUsedAt ? formatAgo(key.lastUsedAt) : "never"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={stateMeta[key.state].badge}>
                      {stateMeta[key.state].label}
                    </Badge>
                    {key.revokedAt && key.state !== "active" && (
                      <div className="text-muted-foreground mt-1 text-xs whitespace-nowrap">
                        {key.state === "expiring" ? "Stops" : "Stopped"}{" "}
                        {formatDateTime(key.revokedAt)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap max-md:hidden">
                    {key.lastUsedAt ? formatAgo(key.lastUsedAt) : "Never"}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap max-sm:hidden">
                    {formatDate(key.dateCreated)}
                  </TableCell>
                  <TableCell>
                    {key.state !== "revoked" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <span className="sr-only">
                              Actions for {keyName(key)}
                            </span>
                            <MoreHorizontalIcon />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            disabled={key.state !== "active"}
                            onSelect={() => setRotating(key)}
                          >
                            <RefreshCwIcon /> Rotate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setRevoking(key)}
                          >
                            <BanIcon /> Revoke
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={creating}
        onOpenChange={(next) => !pending && setCreating(next)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{partner ? "New partner key" : "New API key"}</DialogTitle>
            <DialogDescription>
              A key for {productName}. Its secret is shown once, right after
              it&apos;s created.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="key-label">Label (optional)</Label>
            <Input
              id="key-label"
              placeholder="e.g. Storefront, CI deploys"
              value={label}
              maxLength={100}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setCreating(false)}
            >
              Cancel
            </Button>
            <Button disabled={pending} onClick={create}>
              {pending && <Spinner />}
              Create key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={rotating !== null}
        onOpenChange={(next) => !pending && !next && setRotating(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rotate {rotating && keyName(rotating)}</DialogTitle>
            <DialogDescription>
              Creates a new key with the same label. Put the new key where the
              old one is used before the old one stops.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Keep the old key working for</Label>
            <Select value={grace} onValueChange={setGrace}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {graceOptions.map((o) => (
                  <SelectItem key={o.hours} value={String(o.hours)}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setRotating(null)}
            >
              Cancel
            </Button>
            <Button disabled={pending} onClick={rotate}>
              {pending && <Spinner />}
              Rotate key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmAction
        open={revoking !== null}
        onOpenChange={(next) => !next && setRevoking(null)}
        title={`Revoke ${revoking ? keyName(revoking) : "key"}?`}
        description={
          <>
            <p>It stops working at once. This can&apos;t be undone.</p>
            {!partner && revoking?.state === "active" && activeCount === 1 && (
              <p className="text-destructive font-medium">
                This is {productName}&apos;s last active key: its storefront
                will lose access to the API until it gets a new one.
              </p>
            )}
          </>
        }
        confirmLabel="Revoke key"
        destructive
        onConfirm={async () => {
          if (!revoking) return false;
          const result = await actions.revoke(productId, revoking.id);
          if (result.ok) toast.success(`${keyName(revoking)} revoked`);
          else toast.error(result.error);
          return result.ok;
        }}
      />

      <SecretDialog secret={shown} onClose={() => setShown(null)} />
    </>
  );
}
