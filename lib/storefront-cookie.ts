/**
 * The storefront someone picked in the switcher, for someone with several (a reseller's team has one
 * per storefront of the reseller). The server sends it to the API as X-Product-Id; the API ignores a
 * storefront that isn't theirs and falls back to the session's own pick.
 */
export const STOREFRONT_COOKIE = "ap_storefront";
