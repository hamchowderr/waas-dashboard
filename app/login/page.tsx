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

  return (
    <div className="flex pb-8 lg:h-screen lg:pb-0">
      <div className="bg-muted hidden w-1/2 flex-col justify-between p-10 lg:flex">
        <div className="flex items-center gap-2 font-semibold">
          <ServerCogIcon className="size-5" />
          WaaS Admin
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <LoginMotion className="max-w-md" />
        </div>
        <p className="text-muted-foreground max-w-sm text-sm">
          Health of the provisioning API, its background jobs, every store and its backups.
        </p>
      </div>

      <div className="flex w-full items-center justify-center lg:w-1/2">
        <div className="w-full max-w-md space-y-8 px-4">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-bold">Sign in</h2>
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
            <Button type="submit" variant="outline" className="w-full">
              <GithubIcon />
              Continue with GitHub
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
