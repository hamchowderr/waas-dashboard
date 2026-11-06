import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRightIcon, BookOpenIcon } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { INTEGRATION_GROUPS, publicApiUrl, type IntegrationLink } from "@/lib/integrations";
import { CopyButton } from "../sell/kit-ui";

export const metadata: Metadata = { title: "Integrations" };

/** A dashboard page keeps the storefront picked in the header; a guide or another site opens in a new tab. */
function LinkButton({ link, product, primary }: { link: IntegrationLink; product?: string; primary?: boolean }) {
  const inside = link.href.startsWith("/");
  const href = inside && product ? `${link.href}?product=${encodeURIComponent(product)}` : link.href;
  return (
    <Button asChild size="sm" variant={primary ? "default" : "outline"}>
      {inside ? (
        <Link href={href}>{link.label}</Link>
      ) : (
        <a href={href} target="_blank" rel="noreferrer">
          {primary && <BookOpenIcon data-icon="inline-start" />}
          {link.label}
          {!primary && <ArrowUpRightIcon data-icon="inline-end" />}
        </a>
      )}
    </Button>
  );
}

/** The connector's address, ready to paste into an AI app. */
function ConnectorAddress({ label, url }: { label: string; url: string }) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs">{label}</p>
      <div className="flex items-center gap-2">
        <code className="bg-muted min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-xs">{url}</code>
        <CopyButton text={url} label={label} />
      </div>
    </div>
  );
}

export default async function IntegrationsPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const { product } = await searchParams;
  const api = publicApiUrl();

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        title="Integrations"
        description="Every way to connect your stores to the tools you already use, with the guide that sets each one up."
      />
      {INTEGRATION_GROUPS.map((group) => (
        <section key={group.id} className="space-y-3" aria-labelledby={`integrations-${group.id}`} data-tour-step-id={`integrations-${group.id}`}>
          <div className="space-y-1">
            <h2 id={`integrations-${group.id}`} className="text-lg font-semibold">
              {group.title}
            </h2>
            <p className="text-muted-foreground text-sm">{group.description}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {group.items.map((item) => (
              <Card key={item.id} className={`flex flex-col ${group.items.length === 1 ? "md:col-span-2" : ""}`}>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    {item.name}
                    {item.note && (
                      <Badge variant="outline" className="text-muted-foreground font-normal">
                        {item.note}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{item.summary}</CardDescription>
                </CardHeader>
                {item.id === "mcp" && (
                  <CardContent className="grid gap-3 lg:grid-cols-2">
                    <ConnectorAddress label="Connector address" url={`${api}/mcp`} />
                    <ConnectorAddress label="Look-only address" url={`${api}/mcp/read-only`} />
                  </CardContent>
                )}
                <CardFooter className="mt-auto flex flex-wrap gap-2">
                  <LinkButton link={item.guide} primary />
                  {item.action && <LinkButton link={item.action} product={product} />}
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
