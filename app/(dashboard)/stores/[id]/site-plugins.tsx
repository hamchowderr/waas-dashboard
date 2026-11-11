import { ChevronDown, PackageIcon } from "lucide-react";

import { PluginIcon } from "@/components/admin/plugin-list";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardDescription, CardHeader, CardIcon, CardTitle } from "@/components/ui/card";
import type { HighLevelLink, TenantPlugins } from "@/lib/api/types";

/** What a plugin is for, without its own name repeated in front ("FluentHub: one dashboard…"). */
function aboutOf(p: { name: string; about?: string | null }) {
  if (!p.about) return "Included with the site.";
  const prefix = `${p.name}: `;
  return p.about.startsWith(prefix) ? p.about.charAt(prefix.length).toUpperCase() + p.about.slice(prefix.length + 1) : p.about;
}

/**
 * What comes installed on the store: the plugins its site type turns on and what each is for, whether the owner may
 * add plugins, and on a HighLevel site what is connected. The same the owner sees in WordPress on Dashboard > Your plan.
 */
export function SitePluginsCard({ plugins, highLevel }: { plugins: TenantPlugins; highLevel: HighLevelLink | null }) {
  const types = plugins.siteTypes.map((t) => t.title).join(", ");
  const isHighLevel = plugins.siteTypes.some((t) => t.key === "highlevel");
  const has = (file: string) => plugins.plugins.some((p) => p.file === file);
  return (
    <Card data-testid="site-plugins">
      <CardHeader>
        <CardIcon>
          <PackageIcon />
        </CardIcon>
        <CardTitle>What comes installed</CardTitle>
        <CardDescription>
          {plugins.plugins.length > 0
            ? `The plugins included with this site (${types}) and what each is for. The owner sees the same list in WordPress, under Dashboard > Your plan.`
            : "This site has no site type, so every plugin of the store template stays on."}
        </CardDescription>
      </CardHeader>
      {plugins.plugins.length > 0 && (
        <CardContent className="space-y-4 p-0">
          {/* The plugins' logos in one row; what each is for opens below, as tiles two across once there's room. */}
          <Collapsible className="space-y-4 px-(--card-spacing)">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <ul className="flex flex-wrap gap-1.5" aria-label="Plugins">
                {plugins.plugins.map((p) => (
                  <li key={p.file} title={p.name}>
                    <PluginIcon slug={p.file.split("/")[0]} name={p.name} className="size-9 rounded-xl" />
                    <span className="sr-only">{p.name}</span>
                  </li>
                ))}
              </ul>
              <CollapsibleTrigger className="text-primary group inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline pointer-coarse:min-h-11">
                <span className="group-data-[state=open]:hidden">What each one does</span>
                <span className="hidden group-data-[state=open]:inline">Hide</span>
                <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" aria-hidden />
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <ul className="grid gap-2 @xl/main:grid-cols-2">
                {plugins.plugins.map((p) => (
                  <li key={p.file} className="bg-muted flex items-start gap-3 rounded-2xl p-3 text-sm">
                    <PluginIcon slug={p.file.split("/")[0]} name={p.name} className="size-10 rounded-xl" />
                    <span className="min-w-0">
                      <span className="block font-semibold">{p.name}</span>
                      <span className="text-muted-foreground block">{aboutOf(p)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
          <p className="text-muted-foreground px-(--card-spacing) text-sm text-pretty">
            {plugins.ownPlugins
              ? "The owner can add plugins of their own; they stay on. The plugins above are kept on for them, so a plugin that does the same job isn't needed (FluentSnippets already handles code snippets and shortcodes)."
              : "Plugins follow the site type: these stay on, and any other plugin is switched off."}
          </p>
          {isHighLevel && (
            <div className="border-t px-(--card-spacing) pt-4">
              <div className="mb-2 text-sm font-medium">Connected to HighLevel</div>
              <div className="space-y-2 text-sm">
                {has("wp-fusion-lite/wp-fusion-lite.php") && (
                  <div className="flex items-start justify-between gap-4">
                    <span>
                      WP Fusion Lite
                      <span className="text-muted-foreground block">New users and sign-ups go to the sub-account as contacts.</span>
                    </span>
                    {highLevel?.connected ? (
                      <Badge variant="success">Connected for you</Badge>
                    ) : (
                      <Badge variant="outline">{highLevel ? "Connecting" : "No sub-account yet"}</Badge>
                    )}
                  </div>
                )}
                {has("leadconnector/leadconnector.php") && (
                  <div className="flex items-start justify-between gap-4">
                    <span>
                      LeadConnector
                      <span className="text-muted-foreground block">
                        HighLevel forms, chat widget and calendars. The owner signs in once in WordPress, under LeadConnector.
                      </span>
                    </span>
                    <Badge variant="outline">Owner signs in</Badge>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
