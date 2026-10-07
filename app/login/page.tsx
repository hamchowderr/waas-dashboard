import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GithubIcon, ServerCogIcon } from "lucide-react";

import { auth, isAllowed, signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { LoginMotion } from "@/components/admin/login-motion";

export const metadata: Metadata = { title: "Sign in" };

const errors: Record<string, string> = {
  AccessDenied: "This GitHub account is not on the dashboard's allowlist.",
  Configuration: "Sign-in is not configured yet. Check the GitHub OAuth app settings."
};

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
  const session = await auth();
  if (isAllowed(session?.user?.login)) redirect("/");

  const redirectTo = samePath(callbackUrl);

  const brand = (
    <div className="flex items-center gap-2 font-semibold">
      <ServerCogIcon className="size-5" />
      WaaS Admin
    </div>
  );
  const blurb = "Health of the provisioning API, its background jobs, every store and its backups.";

  // Large screens: the motion panel beside the form. Smaller ones: one centred column
  // (brand, a smaller motion, the form) with the blurb at the bottom. Each layout has
  // its own copy of the motion; only the one on screen loads and animates.
  return (
    <div className="flex lg:h-screen">
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
              Use the GitHub account that has access to this dashboard.
            </p>
          </div>

          {error && (
            <p role="alert" className="bg-destructive/10 text-destructive rounded-md border border-destructive/20 p-3 text-sm">
              {errors[error] ?? "Sign-in failed. Try again."}
            </p>
          )}

          <form
            action={async () => {
              "use server";
              await signIn("github", { redirectTo });
            }}>
            <Button type="submit" variant="outline" className="h-11 w-full lg:h-8">
              <GithubIcon />
              Continue with GitHub
            </Button>
          </form>
        </div>
        <p className="text-muted-foreground mx-auto mt-8 max-w-xs text-center text-xs lg:hidden">{blurb}</p>
      </main>
    </div>
  );
}
