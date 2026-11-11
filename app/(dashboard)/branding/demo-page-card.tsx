import { ArrowUpRightIcon, MonitorPlayIcon } from "lucide-react";

import { requestHost, sellerAddress } from "@/lib/dashboard-host";
import { Button } from "@/components/ui/button";
import { Card, CardIcon, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "../sell/kit-ui";

/**
 * The link to a storefront's or reseller's own demo page: live demo websites in their look, for prospects. On the
 * storefront's own dashboard address it is that address's /demo, so the link never shows the platform's name.
 */
export async function DemoPageCard({ id, whose }: { id: string; whose: string }) {
  const [host, seller] = await Promise.all([requestHost(), sellerAddress()]);
  const origin = host && host !== "localhost" ? `https://${host}` : "http://localhost:3000";
  const link = seller?.productId === id ? `${origin}/demo` : `${origin}/demo/${id}`;
  return (
    <Card>
      <CardHeader>
        <CardIcon>
          <MonitorPlayIcon />
        </CardIcon>
        <CardTitle>
          Demo page
        </CardTitle>
        <CardDescription>
          Live demo websites in {whose} look, with a &ldquo;Start your website&rdquo; button to the shop link above. Send it to
          prospects: the demos run in their browser, and nothing is saved or made on the server.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        <code className="bg-muted min-w-0 flex-1 truncate rounded-lg px-3 py-1.5 text-xs">{link}</code>
        <CopyButton text={link} label="demo page link" />
        <Button asChild variant="outline" size="sm">
          <a href={link} target="_blank" rel="noopener">
            Open
            <ArrowUpRightIcon data-icon="inline-end" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
