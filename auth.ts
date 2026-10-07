import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

/** GitHub logins allowed to sign in, from ALLOWED_GITHUB_LOGINS (comma or space separated). */
export function allowedLogins(): Set<string> {
  return new Set(
    (process.env.ALLOWED_GITHUB_LOGINS ?? "")
      .split(/[\s,]+/)
      .map((login) => login.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isAllowed(login: unknown): boolean {
  return typeof login === "string" && allowedLogins().has(login.toLowerCase());
}

declare module "next-auth" {
  interface Session {
    user: { login: string; name?: string | null; email?: string | null; image?: string | null };
  }
}

// GitHub OAuth app credentials come from AUTH_GITHUB_ID and AUTH_GITHUB_SECRET, the
// session cookie is signed with AUTH_SECRET. Sessions are stateless JWTs: no database.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 },
  callbacks: {
    // Refuses anyone outside the allowlist at sign-in.
    signIn({ profile }) {
      return isAllowed(profile?.login);
    },
    jwt({ token, profile }) {
      if (profile?.login) token.login = profile.login;
      return token;
    },
    session({ session, token }) {
      session.user.login = typeof token.login === "string" ? token.login : "";
      return session;
    },
    // Checked on every request by proxy.ts, so removing a login from the allowlist
    // locks it out without waiting for its session to expire.
    authorized({ auth }) {
      return isAllowed(auth?.user?.login);
    }
  }
});
