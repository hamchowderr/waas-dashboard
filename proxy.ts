import { NextResponse, type NextRequest } from "next/server";

/** Better Auth's session cookie; the __Secure- form is used on https. */
const SESSION_COOKIES = ["__Secure-better-auth.session_token", "better-auth.session_token"];

// A quick check that a session cookie is there, so signed-out visitors go straight to sign-in.
// Whether the session is real, and what it may see, is checked by the API on every request.
export function proxy(request: NextRequest) {
  if (process.env.WAAS_API_FIXTURES === "1") return NextResponse.next();
  if (SESSION_COOKIES.some((name) => request.cookies.has(name))) return NextResponse.next();
  const login = new URL("/login", request.url);
  const back = request.nextUrl.pathname + request.nextUrl.search;
  if (back !== "/") login.searchParams.set("callbackUrl", back);
  return NextResponse.redirect(login);
}

// Everything except the sign-in page, its public motion files (/motion), the sign-in routes and
// static files needs a session.
export const config = {
  matcher: ["/((?!login|motion/|api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico)$).*)"]
};
