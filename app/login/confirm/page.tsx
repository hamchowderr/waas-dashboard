import type { Metadata } from "next";
import Link from "next/link";

import { AccountCard } from "@/components/auth/account-card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Sign in" };

/** The query Better Auth's verify route takes; anything else is left off. */
const FIELDS = ["token", "callbackURL", "newUserCallbackURL", "errorCallbackURL"] as const;

/**
 * Where the sign-in email's button lands. Opening this page uses nothing: its button goes on to
 * /api/auth/magic-link/verify, which uses the one-time link. Mail scanners that open every link
 * in an email (INKY, Microsoft Safe Links) only see this page, so the link still works for the person.
 */
export default async function ConfirmSignInPage({
  searchParams
}: {
  searchParams: Promise<Partial<Record<(typeof FIELDS)[number], string | string[]>>>;
}) {
  const query = await searchParams;
  const fields = FIELDS.flatMap((name) => {
    const value = query[name];
    return typeof value === "string" && value ? [[name, value] as const] : [];
  });
  if (!fields.some(([name]) => name === "token")) {
    return (
      <AccountCard title="Link not complete" description="This sign-in link is missing a part. Ask for a new sign-in email.">
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Back to sign-in</Link>
        </Button>
      </AccountCard>
    );
  }
  return (
    <AccountCard title="Sign in" description="Press the button to finish signing in. The link works once and expires 15 minutes after it was sent.">
      {/* A form, not a link: scanners follow links, but don't press buttons. */}
      <form action="/api/auth/magic-link/verify" method="get">
        {fields.map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <Button type="submit" className="h-11 w-full lg:h-9">
          Sign in
        </Button>
      </form>
    </AccountCard>
  );
}
