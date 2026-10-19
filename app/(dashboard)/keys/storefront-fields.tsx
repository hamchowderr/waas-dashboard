"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StorefrontRequest } from "../actions";

export const EMPTY_STOREFRONT: StorefrontRequest = { email: "", subdomain: "" };

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/** Why the fields can't be sent yet, or null. */
export function storefrontFieldsError(value: StorefrontRequest): string | null {
  if (!EMAIL.test(value.email.trim())) return "Enter the owner's email address.";
  if (value.subdomain && !LABEL.test(value.subdomain)) return "The address can only use letters, digits and dashes.";
  return null;
}

/** The owner's email and the storefront's address, for a ready-made storefront. */
export function StorefrontFields({
  value,
  onChange,
  idPrefix,
}: {
  value: StorefrontRequest;
  onChange: (value: StorefrontRequest) => void;
  idPrefix: string;
}) {
  const subdomainError = value.subdomain && !LABEL.test(value.subdomain);
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-email`}>Owner email</Label>
        <Input
          id={`${idPrefix}-email`}
          type="email"
          value={value.email}
          maxLength={254}
          onChange={(e) => onChange({ ...value, email: e.target.value })}
        />
        <p className="text-muted-foreground text-sm">
          They become the site&apos;s WordPress administrator and set their
          password with &quot;Lost your password?&quot; on its login page.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-subdomain`}>Address</Label>
        <Input
          id={`${idPrefix}-subdomain`}
          placeholder="acme"
          value={value.subdomain}
          maxLength={63}
          onChange={(e) =>
            onChange({ ...value, subdomain: e.target.value.trim().toLowerCase() })
          }
        />
        <p
          className={
            subdomainError
              ? "text-destructive text-sm"
              : "text-muted-foreground text-sm"
          }
        >
          {subdomainError
            ? "Letters, digits and dashes only."
            : "The first part of the storefront's address on the platform domain. Their own domain can be added later from its store page."}
        </p>
      </div>
    </div>
  );
}
