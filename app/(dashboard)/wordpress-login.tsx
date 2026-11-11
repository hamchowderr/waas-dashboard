"use client";

import * as React from "react";
import { ExternalLinkIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { storefrontWordPressLogin, wordPressLogin } from "./actions";

/**
 * "Log in to WordPress": asks the API for a one-time link and opens it in a new tab, signed in to the site's
 * wp-admin. The tab opens on the click, before the link comes back, so pop-up blockers let it through.
 * Give tenantId for a store, or productId for that product's ready-made storefront.
 */
export function WordPressLoginButton({
  tenantId,
  productId,
  variant = "outline",
  label = "Log in to WordPress"
}: {
  tenantId?: string;
  productId?: string;
  variant?: "default" | "outline";
  label?: string;
}) {
  const [pending, setPending] = React.useState(false);

  const open = async () => {
    const tab = window.open("about:blank", "_blank");
    setPending(true);
    try {
      const result = tenantId ? await wordPressLogin(tenantId) : await storefrontWordPressLogin(productId!);
      if (!result.ok) {
        tab?.close();
        toast.error(result.error);
        return;
      }
      if (!result.data.oneClick) {
        toast.info("This site's WordPress is older than one-click login, so it opens the login page. Sign in with your password.");
      }
      if (tab) {
        // The site can't reach back into the dashboard.
        tab.opener = null;
        tab.location.href = result.data.url;
      } else {
        window.location.href = result.data.url;
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <Button variant={variant} size="sm" disabled={pending} onClick={open}>
      {pending && <Spinner />}
      {label}
      {!pending && <ExternalLinkIcon />}
    </Button>
  );
}
