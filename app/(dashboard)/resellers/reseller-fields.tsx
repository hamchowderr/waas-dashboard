"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ResellerSettings } from "@/lib/api/types";

/** The reseller settings form as typed: limits empty for no limit. */
export type ResellerForm = { name: string; maxProducts: string; maxTenants: string; wholesalePercent: string; billingEmail: string };

export const EMPTY_RESELLER: ResellerForm = { name: "", maxProducts: "1", maxTenants: "", wholesalePercent: "40", billingEmail: "" };

export function toForm(r: ResellerSettings): ResellerForm {
  return {
    name: r.name,
    maxProducts: r.maxProducts === null ? "" : String(r.maxProducts),
    maxTenants: r.maxTenants === null ? "" : String(r.maxTenants),
    wholesalePercent: String(r.wholesalePercent),
    billingEmail: r.billingEmail ?? ""
  };
}

export function toSettings(f: ResellerForm): ResellerSettings {
  return {
    name: f.name.trim(),
    maxProducts: f.maxProducts === "" ? null : Number(f.maxProducts),
    maxTenants: f.maxTenants === "" ? null : Number(f.maxTenants),
    wholesalePercent: Number(f.wholesalePercent),
    billingEmail: f.billingEmail.trim() || null
  };
}

const WHOLE = /^\d{1,6}$/;

function errors(f: ResellerForm) {
  return {
    maxProducts: f.maxProducts && !WHOLE.test(f.maxProducts) ? "A whole number, or empty for no limit." : null,
    maxTenants: f.maxTenants && !WHOLE.test(f.maxTenants) ? "A whole number, or empty for no limit." : null,
    wholesalePercent: !/^\d{1,3}$/.test(f.wholesalePercent) || Number(f.wholesalePercent) > 100 ? "A whole number from 0 to 100." : null,
    billingEmail: f.billingEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.billingEmail.trim()) ? "Not an email address." : null
  };
}

/** True when the form can be sent. */
export function resellerFormReady(f: ResellerForm) {
  return Boolean(f.name.trim()) && Object.values(errors(f)).every((e) => !e);
}

export function ResellerFields({ value, onChange, idPrefix }: { value: ResellerForm; onChange: (next: ResellerForm) => void; idPrefix: string }) {
  const problems = errors(value);
  const set = (key: keyof ResellerForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [key]: key === "name" || key === "billingEmail" ? e.target.value : e.target.value.trim() });
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
    </div>
  );
}
