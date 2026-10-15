"use client";

import * as React from "react";

import { refreshSession } from "@/lib/auth-client";

/**
 * The dashboard's server reads the session through the API, which can't update the browser's
 * cookie. Asking once per page load lets the API extend the session and send the cookie back with
 * its new expiry, so someone who keeps using the dashboard stays signed in.
 */
export function SessionKeepAlive() {
  React.useEffect(() => {
    void refreshSession().catch(() => {});
  }, []);
  return null;
}
