import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ServerCogIcon } from "lucide-react";

import { getViewer } from "@/auth";
import { SignInButtons } from "@/components/auth/sign-in-buttons";
import { LoginMotion } from "@/components/admin/login-motion";
import type { Provider } from "@/lib/auth-client";
import { brandColorVars } from "@/lib/branding";
import { sellerAddress } from "@/lib/dashboard-host";

/** On a seller's own address, the tab shows their name and icon. */
export async function generateMetadata(): Promise<Metadata> {
  const seller = await sellerAddress();
  const name = seller?.brand?.name ?? seller?.productName;
  return {
    title: name ? { absolute: `Sign in · ${name}` } : "Sign in",
    ...(seller?.brand?.iconUrl ? { icons: { icon: seller.brand.iconUrl } } : {})
  };
}

// Better Auth's error codes, as it sends them back here.
const errors: Record<string, string> = {
  email_not_found: "GitHub didn't share an email address for this account. Add a verified email on GitHub and try again.",
  account_not_linked: "This email already signs in another way. Use the button you used before.",
  state_mismatch: "Sign-in took too long or was opened in another tab. Try again.",
  please_restart_the_process: "Sign-in took too long. Try again.",
  invalid_token: "That sign-in link has already been used or isn't valid. Ask for a new one.",
  expired_token: "That sign-in link has expired. Ask for a new one.",
  attempts_exceeded: "That sign-in link has already been used. Ask for a new one."
};

/**
 * Ways to sign in, from AUTH_PROVIDERS (default email: an emailed link). The API must have each one
 * set up: email needs its toSend key, github and google their client id and secret.
 */
function providers(): Provider[] {
  const listed = (process.env.AUTH_PROVIDERS ?? "email").split(/[\s,]+/).map((p) => p.trim().toLowerCase());
  const known = listed.filter((p): p is Provider => p === "email" || p === "github" || p === "google");
  return known.length ? [...new Set(known)] : ["email"];
}

/** Keeps only the path of the page to return to, so sign-in can't bounce to another site. */
function samePath(callbackUrl: string | undefined): string {
  if (!callbackUrl) return "/";
  try {
    const url = new URL(callbackUrl, "http://localhost");
    return `${url.pathname.replace(/^\/+/, "/")}${url.search}`;
  } catch {
    return "/";
  }
}

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const { error, callbackUrl } = await searchParams;
  const redirectTo = samePath(callbackUrl);
  // Signed in already: carry on. Someone without a storefront yet sees what to do from the layout.
  if (await getViewer().catch(() => null)) redirect(redirectTo);

  // A seller's own address shows the seller's look, and only emailed links: GitHub and Google send
  // people back to the platform's address only.
  const seller = await sellerAddress();
  const sellerName = seller?.brand?.name ?? seller?.productName ?? null;
  const brand = seller ? (
    <div className="flex items-center gap-2 font-semibold">
      {seller.brand?.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={seller.brand.logoUrl} alt={sellerName ?? ""} className="h-8 w-auto max-w-48 object-contain" />
      ) : (
        sellerName
      )}
    </div>
  ) : (
    <div className="flex items-center gap-2 font-semibold">
      <ServerCogIcon className="size-5" />
      AnyPress
    </div>
  );
  const blurb = seller
    ? `The dashboard for ${sellerName ?? "your"} stores: backups, store designs, your team and more.`
    : "Your stores, their backups and designs, API keys, webhooks and every call your storefront makes.";
  const ways = seller ? (["email"] as Provider[]) : providers();
  const brandVars = brandColorVars(seller?.brand?.color);

  // Large screens: the motion panel beside the form. Smaller ones: one centred column
  // (brand, a smaller motion, the form) with the blurb at the bottom. Each layout has
  // its own copy of the motion; only the one on screen loads and animates.
  return (
    <div className="flex lg:h-screen">
      {Object.keys(brandVars).length > 0 && (
        <style>{`body{${Object.entries(brandVars).map(([k, v]) => `${k}:${v}`).join(";")}}`}</style>
      )}
      <div className="bg-muted hidden w-1/2 flex-col justify-between p-10 lg:flex">
        {brand}
        <div className="flex flex-1 items-center justify-center py-10">
          <LoginMotion media="(min-width: 1024px)" sizes="(min-width: 1024px) 40vw, 1px" className="max-w-md" />
        </div>
        <p className="text-muted-foreground max-w-sm text-sm">{blurb}</p>
      </div>

      <main className="flex min-h-dvh w-full flex-col px-4 py-8 lg:min-h-0 lg:w-1/2 lg:justify-center lg:py-0">
        <div className="m-auto w-full max-w-sm space-y-8 lg:m-0 lg:mx-auto lg:max-w-md lg:px-4">
          <div className="flex flex-col items-center gap-6 lg:hidden">
            {brand}
            <LoginMotion
              media="(max-width: 1023.98px)"
              sizes="(max-width: 1023.98px) 288px, 1px"
              className="w-60 md:w-72"
            />
          </div>

          <div className="text-center">
            <h2 className="text-3xl font-bold lg:mt-6">Sign in</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              For sellers, resellers and their teams. Use the email address your invitation was sent to.
            </p>
          </div>

          {error && (
            <p role="alert" className="bg-destructive/10 text-destructive rounded-md border border-destructive/20 p-3 text-sm">
              {errors[error.toLowerCase()] ?? "Sign-in failed. Try again."}
            </p>
          )}

          <SignInButtons providers={ways} returnTo={redirectTo} />

          {/* Someone who bought a website for themselves has no account here: theirs is on anypress.io. */}
          {!seller && (
            <p className="text-muted-foreground text-center text-sm">
              Bought a website from AnyPress?{" "}
              <a href="https://anypress.io/account" className="text-foreground font-medium underline-offset-4 hover:underline">
                Manage it at anypress.io/account
              </a>
            </p>
          )}
        </div>
        <p className="text-muted-foreground mx-auto mt-8 max-w-xs text-center text-xs lg:hidden">{blurb}</p>
      </main>
    </div>
  );
}
