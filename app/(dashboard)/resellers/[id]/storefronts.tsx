"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ConfirmAction } from "@/components/admin/confirm-action";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import type { Product } from "@/lib/api/types";
import { setResellerStorefront } from "../../actions";

/** The reseller's storefronts, moving one out, and moving a storefront of its own in. */
export function ResellerStorefronts({
  id,
  name,
  storefronts,
  available
}: {
  id: string;
  name: string;
  storefronts: Product[];
  available: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [adding, setAdding] = React.useState("");
  const [removing, setRemoving] = React.useState<Product | null>(null);
  const [pending, startTransition] = React.useTransition();

  const move = async (productId: string, add: boolean) => {
    const result = await setResellerStorefront(id, productId, add);
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    router.refresh();
    return true;
  };

  return (
    <div className="space-y-4">
      {storefronts.length === 0 ? (
        <p className="text-muted-foreground text-sm">No storefronts yet.</p>
      ) : (
        <ul className="divide-y text-sm">
          {storefronts.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 py-2">
              <div>
                <Link href={`/stores?product=${s.id}`} className="font-medium hover:underline">
                  {s.name}
                </Link>
                <div className="text-muted-foreground text-xs">
                  {s.tenantCount} store{s.tenantCount === 1 ? "" : "s"}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setRemoving(s)}>
                Move out
              </Button>
            </li>
          ))}
        </ul>
      )}
      {available.length > 0 && (
        <div className="flex gap-2">
          <Select value={adding} onValueChange={setAdding}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="A storefront of its own" />
            </SelectTrigger>
            <SelectContent>
              {available.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={!adding || pending}
            onClick={() =>
              startTransition(async () => {
                if (await move(adding, true)) setAdding("");
              })
            }>
            {pending && <Spinner />}
            Move in
          </Button>
        </div>
      )}
      <ConfirmAction
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Move ${removing?.name ?? ""} out of ${name}?`}
        description={<p>It becomes a storefront of its own again. Its stores keep running and stop counting toward {name}&apos;s bill from now.</p>}
        confirmLabel="Move out"
        onConfirm={() => move(removing!.id, false)}
      />
    </div>
  );
}
