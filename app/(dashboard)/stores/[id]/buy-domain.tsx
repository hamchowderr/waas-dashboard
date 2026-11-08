"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Search } from "lucide-react";
import { toast } from "sonner";

import type { BoughtDomain, DomainContact, DomainOffer } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { buyDomain, getDomainTransferCode, searchDomainsToBuy, setDomainAutoRenew } from "../../actions";
import { CopyButton } from "./mail-sender";

const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const EMPTY_CONTACT: DomainContact = {
  firstName: "",
  lastName: "",
  companyName: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  zip: "",
  country: "US",
  email: "",
  phone: ""
};

const CONTACT_FIELDS: { key: keyof DomainContact; label: string; placeholder?: string; optional?: boolean; wide?: boolean; type?: string }[] = [
  { key: "firstName", label: "First name" },
  { key: "lastName", label: "Last name" },
  { key: "companyName", label: "Business name", optional: true, wide: true },
  { key: "email", label: "Email", type: "email", placeholder: "owner@example.com", wide: true },
  { key: "phone", label: "Phone", placeholder: "+1.5555555555" },
  { key: "country", label: "Country", placeholder: "US" },
  { key: "address1", label: "Address", wide: true },
  { key: "address2", label: "Address line 2", optional: true, wide: true },
  { key: "city", label: "City" },
  { key: "state", label: "State or region" },
  { key: "zip", label: "ZIP or postal code" }
];

/**
 * Buys a new domain for the store: search, pick a name, fill in who it is registered to, and the owner gets an
 * invoice. Once it is paid the domain is registered, its DNS set, and the store moves to it by itself.
 */
export function BuyDomain({ tenantId, ownerEmail }: { tenantId: string; ownerEmail?: string | null }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [offers, setOffers] = React.useState<DomainOffer[] | null>(null);
  const [picked, setPicked] = React.useState<DomainOffer | null>(null);
  const [contact, setContact] = React.useState<DomainContact>({ ...EMPTY_CONTACT, email: ownerEmail ?? "" });
  const [ordered, setOrdered] = React.useState<BoughtDomain | null>(null);
  const [pending, startTransition] = React.useTransition();

  const reset = () => {
    setQuery("");
    setOffers(null);
    setPicked(null);
    setOrdered(null);
    setContact({ ...EMPTY_CONTACT, email: ownerEmail ?? "" });
  };

  const search = () =>
    startTransition(async () => {
      if (!query.trim()) return;
      const result = await searchDomainsToBuy(tenantId, query);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setOffers(result.data);
    });

  const buy = () =>
    startTransition(async () => {
      if (!picked) return;
      const result = await buyDomain(tenantId, picked.domainName, contact);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setOrdered(result.data);
      router.refresh();
    });

  const title = ordered ? "Invoice sent" : picked ? `Register ${picked.domainName}` : "Buy a domain";
  const description = ordered
    ? `${ordered.domainName} is held for you. It is registered as soon as the invoice is paid, then the store moves to it by itself.`
    : picked
      ? "Who the domain belongs to. It is registered in this name, kept private in public lookups, and the invoice goes to this email."
      : "Search for a name. The price includes the first year; it renews yearly and you can take it elsewhere any time.";

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Buy a domain
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (pending) return;
          setOpen(next);
          if (!next) reset();
        }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="pe-6 break-words">{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          {ordered ? (
            <div className="space-y-3 text-sm" data-testid="domain-ordered">
              <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                <span className="font-medium break-all">{ordered.domainName}</span>
                <span className="tabular-nums">{dollars(ordered.priceCents)}</span>
              </div>
              {ordered.payUrl && (
                <Button asChild className="w-full">
                  <a href={ordered.payUrl} target="_blank" rel="noopener noreferrer">
                    Pay the invoice <ExternalLink />
                  </a>
                </Button>
              )}
              <p className="text-muted-foreground text-xs">The invoice was also emailed. It is due in 2 days; after that the name is let go.</p>
            </div>
          ) : picked ? (
            <form
              className="grid grid-cols-2 gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                buy();
              }}>
              {CONTACT_FIELDS.map((f) => (
                <div key={f.key} className={f.wide ? "col-span-2 space-y-1.5" : "col-span-2 space-y-1.5 sm:col-span-1"}>
                  <Label htmlFor={`domain-${f.key}`}>
                    {f.label}
                    {f.optional && <span className="text-muted-foreground font-normal"> (optional)</span>}
                  </Label>
                  <Input
                    id={`domain-${f.key}`}
                    type={f.type ?? "text"}
                    value={contact[f.key] ?? ""}
                    placeholder={f.placeholder}
                    required={!f.optional}
                    disabled={pending}
                    autoComplete="off"
                    onChange={(event) => setContact({ ...contact, [f.key]: event.target.value })}
                  />
                </div>
              ))}
              <button type="submit" hidden />
            </form>
          ) : (
            <div className="space-y-3">
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  search();
                }}>
                <Label htmlFor="domain-search" className="sr-only">
                  Name to search for
                </Label>
                <Input
                  id="domain-search"
                  value={query}
                  placeholder="mybakery or mybakery.com"
                  disabled={pending}
                  autoComplete="off"
                  onChange={(event) => setQuery(event.target.value)}
                />
                <Button type="submit" disabled={pending || !query.trim()}>
                  {pending ? <Spinner /> : <Search />}
                  Search
                </Button>
              </form>
              {offers && offers.length === 0 && <p className="text-muted-foreground text-sm">Nothing found. Try another name.</p>}
              {offers && offers.length > 0 && (
                <ul className="divide-y rounded-md border" data-testid="domain-offers">
                  {offers.map((o) => (
                    <li key={o.domainName} className="flex items-center justify-between gap-3 p-3 text-sm">
                      <div className="min-w-0">
                        <div className={o.available ? "font-medium break-all" : "text-muted-foreground break-all"}>{o.domainName}</div>
                        <div className="text-muted-foreground text-xs">
                          {o.available ? `then ${dollars(o.renewalPriceCents!)} a year` : o.reason}
                        </div>
                      </div>
                      {o.available ? (
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="tabular-nums">{dollars(o.priceCents!)}</span>
                          <Button size="sm" onClick={() => setPicked(o)}>
                            Choose
                          </Button>
                        </div>
                      ) : (
                        <Badge variant="outline">Not available</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <DialogFooter>
            {ordered ? (
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  reset();
                }}>
                Done
              </Button>
            ) : picked ? (
              <>
                <Button variant="outline" disabled={pending} onClick={() => setPicked(null)}>
                  Back
                </Button>
                <Button disabled={pending} onClick={buy}>
                  {pending && <Spinner />}
                  Send invoice for {dollars(picked.priceCents!)}
                </Button>
              </>
            ) : (
              <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>
                Cancel
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const STATUS: Record<BoughtDomain["status"], { label: string; variant: "success" | "warning" | "outline" | "destructive" }> = {
  awaiting_payment: { label: "Waiting for payment", variant: "warning" },
  registering: { label: "Registering", variant: "warning" },
  active: { label: "Active", variant: "success" },
  cancelled: { label: "Not paid", variant: "outline" },
  failed: { label: "Failed", variant: "destructive" },
  expired: { label: "Expired", variant: "outline" }
};

/** One bought domain's row: its state, what to pay, renewal on or off, and the code to move it elsewhere. */
export function BoughtDomainRow({ tenantId, domain }: { tenantId: string; domain: BoughtDomain }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [code, setCode] = React.useState<string | null>(null);
  const status = STATUS[domain.status];
  const expires = domain.expiresAt ? new Date(domain.expiresAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : null;

  const toggle = (autoRenew: boolean) =>
    startTransition(async () => {
      const result = await setDomainAutoRenew(tenantId, domain.domainName, autoRenew);
      if (!result.ok) toast.error(result.error);
      else router.refresh();
    });

  const showCode = () =>
    startTransition(async () => {
      const result = await getDomainTransferCode(tenantId, domain.domainName);
      if (!result.ok) toast.error(result.error);
      else setCode(result.data);
    });

  return (
    <div className="space-y-2 p-(--card-spacing) text-sm" data-testid="bought-domain">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium break-all">{domain.domainName}</span>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span>
          {dollars(domain.priceCents)} first year, then {dollars(domain.renewalPriceCents)} a year
        </span>
        {expires && <span>{domain.autoRenew ? `Renews before ${expires}` : `Expires ${expires}`}</span>}
      </div>
      {domain.error && domain.status !== "active" && <p className="text-xs text-red-700 dark:text-red-400">{domain.error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {domain.payUrl && (
          <Button asChild size="sm">
            <a href={domain.payUrl} target="_blank" rel="noopener noreferrer">
              Pay the invoice <ExternalLink />
            </a>
          </Button>
        )}
        {domain.renewalPayUrl && (
          <Button asChild size="sm" variant="outline">
            <a href={domain.renewalPayUrl} target="_blank" rel="noopener noreferrer">
              Pay the renewal <ExternalLink />
            </a>
          </Button>
        )}
        {domain.status === "active" && (
          <>
            <label className="flex items-center gap-2 text-xs">
              <Switch checked={domain.autoRenew} disabled={pending} onCheckedChange={toggle} aria-label={`Renew ${domain.domainName} every year`} />
              Renew every year
            </label>
            {code ? (
              <span className="flex items-center gap-1 text-xs">
                Transfer code <code className="bg-muted rounded px-1.5 py-0.5">{code}</code>
                <CopyButton value={code} label="transfer code" />
              </span>
            ) : (
              <Button size="sm" variant="ghost" disabled={pending} onClick={showCode}>
                {pending && <Spinner />}
                Move to another registrar
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
