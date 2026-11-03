import "server-only";

import { getViewer } from "@/auth";
import { getAdminApi } from "@/lib/api/client";
import type { Product } from "@/lib/api/types";
import { customerFacingShop, type KitContext } from "@/lib/sales-kit";
import { loadSalesKit } from "@/lib/sales-kit-files";

/** The storefront the Sales Kit pages are about: the one picked in the header, else the viewer's own. */
export async function pickProduct(productId: string | undefined): Promise<{ product: Product | undefined; first: Product | undefined }> {
  const api = getAdminApi();
  const viewer = await getViewer();
  const products = await api.products();
  const active = !viewer?.isAdmin ? products.find((p) => p.id === viewer?.active?.productId) : undefined;
  const product = products.find((p) => p.id === productId) ?? active ?? (!viewer?.isAdmin && products.length === 1 ? products[0] : undefined);
  return { product, first: products[0] };
}

/** The kit and what fills it in for one storefront: its brand, shop address, support email and the viewer's name. */
export async function loadKitFor(product: Product) {
  const api = getAdminApi();
  const [viewer, kit, branding, storefront] = await Promise.all([
    getViewer(),
    loadSalesKit(),
    api.branding(product.id).catch(() => null),
    api.storefront(product.id).catch(() => null)
  ]);
  const context: Omit<KitContext, "prices" | "plan"> = {
    brand: branding?.shown.name ?? product.name,
    shop: customerFacingShop(storefront?.domain),
    sender: viewer?.user.name || null,
    support: branding?.shown.supportEmail ?? null,
    // Demo links stay a blank in messages: Playground links name the theme's repository, so a seller pastes their own.
    demo: null
  };
  return { ...kit, context };
}
