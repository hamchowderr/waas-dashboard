"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ResellerSettings } from "@/lib/api/types";

/** The reseller settings form as typed: limits empty for no limit. */
export type ResellerForm = {
  name: string;
  maxProducts: string;
  maxTenants: string;
  wholesalePercent: string;
  billingEmail: string;
  brandName: string;
  brandUrl: string;
  /** Monthly list prices in dollars, as typed. */
  priceSmall: string;
  priceMedium: string;
  priceLarge: string;
};

// The default list prices are the Website plan's: Small $12, Medium 2x, Large 4x.
export const EMPTY_RESELLER: ResellerForm = {
  name: "",
  maxProducts: "1",
  maxTenants: "",
  wholesalePercent: "40",
  billingEmail: "",
  brandName: "",
  brandUrl: "",
  priceSmall: "12",
  priceMedium: "24",
  priceLarge: "48"
};

const dollars = (cents: number) => (cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2));
const cents = (dollars: string) => Math.round(Number(dollars) * 100);
const PRICE = /^\d{1,5}(\.\d{1,2})?$/;

export function toForm(r: ResellerSettings): ResellerForm {
  return {
    name: r.name,
    maxProducts: r.maxProducts === null ? "" : String(r.maxProducts),
    maxTenants: r.maxTenants === null ? "" : String(r.maxTenants),
    wholesalePercent: String(r.wholesalePercent),
    billingEmail: r.billingEmail ?? "",
    brandName: r.brandName ?? "",
    brandUrl: r.brandUrl ?? "",
    priceSmall: dollars(r.listPriceCents.small),
    priceMedium: dollars(r.listPriceCents.medium),
    priceLarge: dollars(r.listPriceCents.large)
  };
}

export function toSettings(f: ResellerForm): ResellerSettings {
  return {
    name: f.name.trim(),
    maxProducts: f.maxProducts === "" ? null : Number(f.maxProducts),
    maxTenants: f.maxTenants === "" ? null : Number(f.maxTenants),
    wholesalePercent: Number(f.wholesalePercent),
    billingEmail: f.billingEmail.trim() || null,
    brandName: f.brandName.trim() || null,
    brandUrl: f.brandUrl.trim() || null,
    listPriceCents: { small: cents(f.priceSmall), medium: cents(f.priceMedium), large: cents(f.priceLarge) }
  };
}

const WHOLE = /^\d{1,6}$/;

const priceError = (value: string) => (!PRICE.test(value) || Number(value) > 10000 ? "Dollars, up to $10,000." : null);

function errors(f: ResellerForm) {
  return {
    maxProducts: f.maxProducts && !WHOLE.test(f.maxProducts) ? "A whole number, or empty for no limit." : null,
    maxTenants: f.maxTenants && !WHOLE.test(f.maxTenants) ? "A whole number, or empty for no limit." : null,
    wholesalePercent: !/^\d{1,3}$/.test(f.wholesalePercent) || Number(f.wholesalePercent) > 100 ? "A whole number from 0 to 100." : null,
    billingEmail: f.billingEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.billingEmail.trim()) ? "Not an email address." : null,
    brandName: f.brandName.trim().length > 60 ? "At most 60 characters." : null,
    brandUrl: f.brandUrl.trim() && !/^https?:\/\/\S+$/.test(f.brandUrl.trim()) ? "A link starting with https://" : null,
    priceSmall: priceError(f.priceSmall),
    priceMedium: priceError(f.priceMedium),
    priceLarge: priceError(f.priceLarge)
  };
}

/** True when the form can be sent. */
export function resellerFormReady(f: ResellerForm) {
  return Boolean(f.name.trim()) && Object.values(errors(f)).every((e) => !e);
}

export function ResellerFields({ value, onChange, idPrefix }: { value: ResellerForm; onChange: (next: ResellerForm) => void; idPrefix: string }) {
  const problems = errors(value);
  const set = (key: keyof ResellerForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [key]: key === "name" || key === "billingEmail" || key === "brandName" ? e.target.value : e.target.value.trim() });
  const field = (key: keyof ResellerForm, label: string, hint: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={`${idPrefix}-${key}`}>{label}</Label>
      <Input id={`${idPrefix}-${key}`} value={value[key]} onChange={set(key)} {...props} />
      <p className={key !== "name" && problems[key] ? "text-destructive text-sm" : "text-muted-foreground text-sm"}>
        {(key !== "name" && problems[key]) || hint}
      </p>
    </div>
  );
  return (
    <div className="space-y-4">
      {field("name", "Name", "The partner's business name.", { maxLength: 100 })}
      <div className="grid gap-4 sm:grid-cols-2">
        {field("maxProducts", "Storefront limit", "Empty for no limit.", { inputMode: "numeric", placeholder: "No limit" })}
        {field("maxTenants", "Store limit", "Across all its storefronts. Empty for no limit.", { inputMode: "numeric", placeholder: "No limit" })}
      </div>
      {field("wholesalePercent", "Wholesale discount (%)", "Off list price, for every live store on its bill.", { inputMode: "numeric" })}
      {field("billingEmail", "Billing email", "Where its monthly bill goes.", { type: "email", placeholder: "billing@partner.example" })}
      <div className="grid gap-4 sm:grid-cols-2">
        {field("brandName", "Brand name", "Shown on its stores' \"site unavailable\" page. Empty uses AnyPress.", { maxLength: 60, placeholder: "AnyPress" })}
        {field("brandUrl", "Brand link", "Where its name links to. Optional.", { type: "url", placeholder: "https://partner.example" })}
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">List price per store, per month ($)</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {field("priceSmall", "Small", "Before the discount.", { inputMode: "decimal" })}
          {field("priceMedium", "Medium", "Before the discount.", { inputMode: "decimal" })}
          {field("priceLarge", "Large", "Before the discount.", { inputMode: "decimal" })}
        </div>
      </div>
    </div>
  );
}
