import { BlocksIcon } from "lucide-react";

import { PluginIcon } from "@/components/admin/plugin-list";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardIcon, CardTitle } from "@/components/ui/card";
import type { HighLevelLink, TenantPlugins } from "@/lib/api/types";

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
        <CardIcon tone="ribbon">
          <BlocksIcon />
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
          {/* Each plugin as a tile with its wordpress.org icon, two across once there's room. */}
          <ul className="grid gap-2 px-(--card-spacing) @xl/main:grid-cols-2">
            {plugins.plugins.map((p) => (
              <li key={p.file} className="bg-muted flex items-start gap-3 rounded-2xl p-3 text-sm">
                <PluginIcon slug={p.file.split("/")[0]} name={p.name} className="size-10 rounded-xl" />
                <span className="min-w-0">
                  <span className="block font-semibold">{p.name}</span>
                  <span className="text-muted-foreground block">{p.about ?? "Included with the site."}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground px-(--card-spacing) text-sm">
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
