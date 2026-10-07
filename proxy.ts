export { auth as proxy } from "@/auth";

// Everything except the sign-in page, Auth.js's own routes and static files needs a session.
export const config = {
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico)$).*)"]
};
