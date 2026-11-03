"use client";

import * as React from "react";
import { DownloadIcon, ExternalLinkIcon, GlobeIcon, MapPinIcon, PhoneIcon, SearchIcon, StarIcon } from "lucide-react";

import type { Prospect, ProspectUsage } from "@/lib/api/types";
import type { GroupId } from "@/lib/sales-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "cn";
import { prospectsCsv } from "@/lib/prospects";
import { findProspects, prospectUsage } from "./actions";

export type FinderGroup = { id: GroupId; title: string; finder: string[] };

export function ProspectFinder({
  productId,
  groups,
  initialGroup,
  onCheck
}: {
  productId: string;
  groups: FinderGroup[];
  initialGroup?: GroupId;
  /** Opens the website check on a prospect's site. */
  onCheck: (url: string) => void;
}) {
  const [groupId, setGroupId] = React.useState<GroupId>(initialGroup ?? groups[0]!.id);
  const group = groups.find((g) => g.id === groupId) ?? groups[0]!;
  const [query, setQuery] = React.useState(group.finder[0] ?? "");
  const [location, setLocation] = React.useState("");
  const [usage, setUsage] = React.useState<ProspectUsage | null>(null);
  const [results, setResults] = React.useState<{ query: string; location: string; prospects: Prospect[] } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [noSiteFirst, setNoSiteFirst] = React.useState(true);
  const [pending, start] = React.useTransition();

  React.useEffect(() => {
    let live = true;
    prospectUsage(productId).then((u) => live && setUsage(u));
    return () => {
      live = false;
    };
  }, [productId]);

  const pickGroup = (id: string) => {
    const next = groups.find((g) => g.id === id);
    if (!next) return;
    setGroupId(next.id);
    setQuery(next.finder[0] ?? "");
  };

  const run = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const result = await findProspects(productId, query, location);
      if (result.ok) {
        setResults({ query: query.trim(), location: location.trim(), prospects: result.search.prospects });
        setUsage(result.search.usage);
      } else {
        setError(result.error);
        if (result.usage) setUsage(result.usage);
      }
    });
  };

  const off = usage !== null && !usage.available;
  const spent = usage !== null && usage.available && usage.used >= usage.limit;
  const shown = results ? (noSiteFirst ? [...results.prospects].sort((a, b) => Number(a.website !== null) - Number(b.website !== null)) : results.prospects) : [];
  const withoutSite = results?.prospects.filter((p) => !p.website).length ?? 0;

  return (
    <div className="space-y-4 lg:space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Find prospects near you</CardTitle>
          <CardDescription>
            Pick who you sell to and where, and get up to 20 local businesses with their phone, website and rating. Businesses with no website come first: they need you most.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {off ? (
            <p className="text-muted-foreground text-sm">The prospect finder isn&apos;t switched on yet. Until it is, use the Google Maps searches on each group&apos;s page.</p>
          ) : (
            <form onSubmit={run} className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                <Select value={groupId} onValueChange={pickGroup}>
                  <SelectTrigger aria-label="Who you sell to" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="church" aria-label="Kind of business" maxLength={100} />
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Columbus, Ohio" aria-label="Where" maxLength={100} />
                <Button type="submit" disabled={pending || spent || query.trim().length < 2 || location.trim().length < 2}>
                  {pending ? <Spinner data-icon="inline-start" /> : <SearchIcon data-icon="inline-start" />}
                  {pending ? "Searching…" : "Search"}
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {group.finder.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setQuery(f)}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                      f === query.trim() ? "bg-foreground text-background border-foreground" : "hover:bg-muted"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </form>
          )}
          {usage && usage.available && (
            <p className="text-muted-foreground text-xs">
              {spent
                ? `You've used this month's ${usage.limit} searches. They start again on ${new Date(usage.resetsAt).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })}.`
                : `${usage.used} of ${usage.limit} searches used this month.`}
            </p>
          )}
          {error && <p className="text-destructive text-sm">{error}</p>}
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <CardTitle>
                {results.prospects.length
                  ? `${results.prospects.length} ${results.prospects.length === 1 ? "result" : "results"} for “${results.query}” in ${results.location}`
                  : `Nothing found for “${results.query}” in ${results.location}`}
              </CardTitle>
              {results.prospects.length > 0 && (
                <CardDescription>
                  {withoutSite ? `${withoutSite} have no website. ` : ""}Check a site to get a report to send with your first email.
                </CardDescription>
              )}
            </div>
            {results.prospects.length > 0 && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setNoSiteFirst((v) => !v)}>
                  {noSiteFirst ? "Google's order" : "No website first"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const url = URL.createObjectURL(new Blob([prospectsCsv(results.prospects)], { type: "text/csv;charset=utf-8" }));
                    const a = Object.assign(document.createElement("a"), { href: url, download: `${results.query}-${results.location}.csv`.toLowerCase().replace(/[^a-z0-9.]+/g, "-") });
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <DownloadIcon data-icon="inline-start" />
                  <span className="max-sm:sr-only">CSV</span>
                </Button>
              </div>
            )}
          </CardHeader>
          {results.prospects.length > 0 && (
            <CardContent>
              <ul className="divide-y rounded-lg border">
                {shown.map((p) => (
                  <li key={p.id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{p.name}</span>
                        {!p.website && <Badge variant="secondary">No website</Badge>}
                        {p.rating !== null && (
                          <span className="text-muted-foreground inline-flex items-center gap-0.5 text-xs">
                            <StarIcon className="size-3 fill-current" aria-hidden />
                            {p.rating.toFixed(1)}
                            {p.reviews !== null && ` (${p.reviews})`}
                          </span>
                        )}
                      </div>
                      {p.address && <p className="text-muted-foreground truncate text-xs">{p.address}</p>}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1.5">
                      {p.phone && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={`tel:${p.phone.replace(/[^\d+]/g, "")}`} aria-label={`Call ${p.name}, ${p.phone}`}>
                            <PhoneIcon data-icon="inline-start" />
                            <span className="sm:hidden">Call</span>
                            <span className="max-sm:hidden">{p.phone}</span>
                          </a>
                        </Button>
                      )}
                      {p.mapsUrl && (
                        <Button variant="ghost" size="icon-sm" asChild>
                          <a href={p.mapsUrl} target="_blank" rel="noreferrer" aria-label={`${p.name} on Google Maps`}>
                            <MapPinIcon />
                          </a>
                        </Button>
                      )}
                      {p.website && (
                        <>
                          <Button variant="ghost" size="icon-sm" asChild>
                            <a href={p.website} target="_blank" rel="noreferrer" aria-label={`Open ${p.name}'s website`}>
                              <GlobeIcon />
                            </a>
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => onCheck(p.website!)}>
                            Check website
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground mt-3 flex items-center gap-1 text-xs">
                Results from Google Maps. <ExternalLinkIcon className="size-3" aria-hidden />
              </p>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
