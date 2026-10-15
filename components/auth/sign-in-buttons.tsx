"use client";

import * as React from "react";
import { GithubIcon, MailIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { emailSignInLink, signInWith, type Provider } from "@/lib/auth-client";

type SocialProvider = Exclude<Provider, "email">;

const labels: Record<SocialProvider, string> = { github: "Continue with GitHub", google: "Continue with Google" };

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.66 4.1-5.35 4.1-3.22 0-5.85-2.67-5.85-5.96S8.78 6.26 12 6.26c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.68 3.7 14.55 2.75 12 2.75 6.89 2.75 2.75 6.9 2.75 12s4.14 9.25 9.25 9.25c5.34 0 8.88-3.75 8.88-9.04 0-.6-.07-1.06-.15-1.51Z"
      />
    </svg>
  );
}

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="bg-destructive/10 text-destructive rounded-md border border-destructive/20 p-3 text-sm">
      {children}
    </p>
  );
}

/** Emails a one-time sign-in link, then says where to look. */
function EmailSignIn({ returnTo }: { returnTo: string }) {
  const [email, setEmail] = React.useState("");
  const [state, setState] = React.useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = React.useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setState("sending");
    setError(null);
    try {
      await emailSignInLink(email.trim(), returnTo);
      setState("sent");
    } catch (e) {
      setError((e as Error).message);
      setState("idle");
    }
  }

  if (state === "sent") {
    return (
      <div className="space-y-3 rounded-md border p-4 text-sm">
        <p className="font-medium">Check your email</p>
        <p className="text-muted-foreground">
          We sent a sign-in link to <span className="text-foreground">{email.trim()}</span>. It works once and expires in
          15 minutes.
        </p>
        <Button type="button" variant="link" className="h-auto p-0" onClick={() => setState("idle")}>
          Use a different address
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {error && <Alert>{error}</Alert>}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@agency.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 lg:h-8"
        />
      </div>
      <Button type="submit" className="h-11 w-full lg:h-8" disabled={state === "sending"}>
        <MailIcon />
        {state === "sending" ? "Sending…" : "Email me a sign-in link"}
      </Button>
    </form>
  );
}

/** The emailed link and/or one button per sign-in provider; each comes back to `returnTo`. */
export function SignInButtons({ providers, returnTo }: { providers: Provider[]; returnTo: string }) {
  const [pending, setPending] = React.useState<SocialProvider | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const social = providers.filter((p): p is SocialProvider => p !== "email");

  async function start(provider: SocialProvider) {
    setPending(provider);
    setError(null);
    try {
      await signInWith(provider, returnTo);
    } catch (e) {
      setError((e as Error).message);
      setPending(null);
    }
  }

  return (
    <div className="space-y-6">
      {providers.includes("email") && <EmailSignIn returnTo={returnTo} />}
      {providers.includes("email") && social.length > 0 && (
        <div className="text-muted-foreground flex items-center gap-3 text-xs">
          <span className="bg-border h-px flex-1" />
          or
          <span className="bg-border h-px flex-1" />
        </div>
      )}
      {social.length > 0 && (
        <div className="space-y-3">
          {error && <Alert>{error}</Alert>}
          {social.map((provider) => (
            <Button
              key={provider}
              type="button"
              variant="outline"
              className="h-11 w-full lg:h-8"
              disabled={pending !== null}
              onClick={() => void start(provider)}>
              {provider === "github" ? <GithubIcon /> : <GoogleIcon />}
              {pending === provider ? "Opening…" : labels[provider]}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
