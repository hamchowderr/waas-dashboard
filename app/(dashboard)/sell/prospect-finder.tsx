"use client";

import * as React from "react";
import { CheckIcon, ClockIcon, DownloadIcon, PlusIcon, FacebookIcon, InstagramIcon, LinkedinIcon, MusicIcon, TwitterIcon, YoutubeIcon, ExternalLinkIcon, GlobeIcon, MailIcon, MapPinIcon, PhoneIcon, SearchIcon, StarIcon } from "lucide-react";

import type { CrmProspect, CrmTarget, Prospect, ProspectContacts, ProspectCrm, ProspectCrmResult, ProspectMailbox, ProspectUsage, SocialNetwork } from "@/lib/api/types";
import type { GroupId } from "@/lib/sales-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardIcon } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "cn";
import { prospectsCsv } from "@/lib/prospects";
import { toast } from "sonner";
import { addToCrm, findProspects, readWebsites, prospectContacts, prospectCrm, prospectMailbox, prospectUsage } from "./actions";
import { HighLevelConnect, MailboxConnect } from "./crm-connect";

export type FinderGroup = { id: GroupId; title: string; finder: string[] };

const NETWORK_LABEL: Record<SocialNetwork, string> = { facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn", x: "X", youtube: "YouTube", tiktok: "TikTok" };
const NETWORK_ICON: Record<SocialNetwork, typeof FacebookIcon> = {
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  linkedin: LinkedinIcon,
  x: TwitterIcon,
  youtube: YoutubeIcon,
  tiktok: MusicIcon
};

const CRM_LABEL: Record<CrmTarget, string> = { fluentcrm: "FluentCRM", highlevel: "HighLevel" };
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** What one add did, in a line: what went where, and what was left out. */
function addSummary(r: ProspectCrmResult): string {
  const parts: string[] = [];
  if (r.fluentcrm.queued) parts.push(`${plural(r.fluentcrm.queued, "business", "businesses")} going into FluentCRM`);
  if (r.highlevel.sent) parts.push(`${plural(r.highlevel.sent, "business", "businesses")} sent to HighLevel`);
  if (r.fluentcrm.noEmail) parts.push(`${plural(r.fluentcrm.noEmail, "had", "had")} no email, so FluentCRM couldn't take ${r.fluentcrm.noEmail === 1 ? "it" : "them"}`);
  if (r.highlevel.failed) parts.push(`HighLevel didn't take ${r.highlevel.failed}`);
  const already = Math.max(r.fluentcrm.already, r.highlevel.already);
  if (already && !parts.length) parts.push(already === 1 ? "That one is in your CRM already" : "Those are in your CRM already");
  if (!parts.length) parts.push(r.fluentcrm.unavailable ?? r.highlevel.unavailable ?? "Nothing was added");
  const line = parts.join(". ");
  return line.charAt(0).toUpperCase() + line.slice(1) + ".";
}

/** Today's line of Google's opening hours ("Monday: 9:00 AM – 5:00 PM" → "9:00 AM – 5:00 PM today"). */
function todaysHours(hours: string[] | null): string | null {
  if (!hours?.length) return null;
  const day = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const line = hours.find((h) => h.startsWith(`${day}:`));
  return line ? `${line.slice(day.length + 1).trim()} today` : null;
}

export function ProspectFinder({
  productId,
  groups,
  initialGroup,
  onRead
}: {
  productId: string;
  groups: FinderGroup[];
  initialGroup?: GroupId;
  /** Shows the storefront's prospects, after a website was sent to be read. */
  onRead: () => void;
}) {
  const [groupId, setGroupId] = React.useState<GroupId>(initialGroup ?? groups[0]!.id);
  const group = groups.find((g) => g.id === groupId) ?? groups[0]!;
  const [query, setQuery] = React.useState(group.finder[0] ?? "");
  const [location, setLocation] = React.useState("");
  const [usage, setUsage] = React.useState<ProspectUsage | null>(null);
  const [results, setResults] = React.useState<{ query: string; location: string; group: string; prospects: Prospect[]; nextPageToken: string | null } | null>(null);
  const [crm, setCrm] = React.useState<ProspectCrm | null>(null);
  const [hlOpen, setHlOpen] = React.useState(false);
  const [mailbox, setMailbox] = React.useState<ProspectMailbox | null>(null);
  const [mbOpen, setMbOpen] = React.useState(false);
  const [adding, setAdding] = React.useState<Set<string>>(new Set());
  const [contacts, setContacts] = React.useState<Record<string, ProspectContacts>>({});
  const [reading, setReading] = React.useState(false);
  const [more, startMore] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [noSiteFirst, setNoSiteFirst] = React.useState(true);
  const [pending, start] = React.useTransition();

  React.useEffect(() => {
    let live = true;
    prospectUsage(productId).then((u) => live && setUsage(u));
    prospectCrm(productId).then((c) => live && setCrm(c));
    prospectMailbox(productId).then((m) => live && setMailbox(m));
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

  // Reads each new prospect's own website for emails, a contact page and social profiles.
  const readSites = async (prospects: Prospect[]) => {
    const urls = prospects.map((p) => p.website).filter((u): u is string => !!u);
    if (!urls.length) return;
    setReading(true);
    try {
      const found = await prospectContacts(urls);
      setContacts((prev) => ({ ...prev, ...found }));
    } finally {
      setReading(false);
    }
  };

  const run = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const result = await findProspects(productId, query, location);
      if (result.ok) {
        setResults({ query: query.trim(), location: location.trim(), group: group.title, prospects: result.search.prospects, nextPageToken: result.search.nextPageToken });
        setContacts({});
        setUsage(result.search.usage);
        void readSites(result.search.prospects);
      } else {
        setError(result.error);
        if (result.usage) setUsage(result.usage);
      }
    });
  };

  const loadMore = () => {
    if (!results?.nextPageToken) return;
    setError(null);
    startMore(async () => {
      const result = await findProspects(productId, results.query, results.location, results.nextPageToken!);
      if (result.ok) {
        const seen = new Set(results.prospects.map((p) => p.id));
        const fresh = result.search.prospects.filter((p) => !seen.has(p.id));
        setResults({ ...results, prospects: [...results.prospects, ...fresh], nextPageToken: result.search.nextPageToken });
        setUsage(result.search.usage);
        void readSites(fresh);
      } else {
        setError(result.error);
        if (result.usage) setUsage(result.usage);
      }
    });
  };

  const targets: CrmTarget[] = crm ? [...(crm.fluentcrm.available ? (["fluentcrm"] as const) : []), ...(crm.highlevel.connected ? (["highlevel"] as const) : [])] : [];

  const crmProspect = (p: Prospect): CrmProspect => {
    const found = p.website ? contacts[p.website] : undefined;
    return {
      id: p.id,
      name: p.name,
      type: p.type,
      phone: p.phone,
      website: p.website,
      address: p.address,
      mapsUrl: p.mapsUrl,
      rating: p.rating,
      reviews: p.reviews,
      hours: p.hours,
      email: found?.emails[0] ?? null,
      contactPage: found?.contactPage ?? null,
      socials: found?.socials ?? []
    };
  };

  // Reads the business's website (the check, what kind of site it is and its demo) and adds it to Your prospects.
  const [readingSite, setReadingSite] = React.useState<string | null>(null);
  const read = async (p: Prospect) => {
    if (!p.website) return;
    setReadingSite(p.id);
    try {
      const res = await readWebsites(productId, [{ company: p.name, website: p.website, placeId: p.id, details: crmProspect(p) }]);
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.added ? `Reading ${p.name}'s website. Its check and demo will be on Your prospects in about a minute.` : `${p.name} is on Your prospects already.`);
      onRead();
    } finally {
      setReadingSite(null);
    }
  };

  // Sends businesses to every CRM this storefront has, then marks the ones each took.
  const add = async (list: Prospect[]) => {
    if (!results || !list.length || !targets.length) return;
    const ids = list.map((p) => p.id);
    setAdding((prev) => new Set([...prev, ...ids]));
    try {
      const sent = list.map(crmProspect);
      const res = await addToCrm(productId, sent, results.group, targets);
      if (!res.ok) return void toast.error(res.error);
      const r = res.result;
      const took = new Map<string, CrmTarget[]>();
      for (const p of sent) {
        const mine: CrmTarget[] = [];
        if (targets.includes("fluentcrm") && !r.fluentcrm.unavailable && p.email) mine.push("fluentcrm");
        if (targets.includes("highlevel") && !r.highlevel.unavailable && !r.highlevel.failed) mine.push("highlevel");
        took.set(p.id, mine);
      }
      setResults((prev) =>
        prev && { ...prev, prospects: prev.prospects.map((p) => (took.has(p.id) ? { ...p, inCrm: [...new Set([...p.inCrm, ...took.get(p.id)!])] } : p)) }
      );
      (r.fluentcrm.queued || r.highlevel.sent ? toast.success : toast.info)(addSummary(r));
    } finally {
      setAdding((prev) => new Set([...prev].filter((id) => !ids.includes(id))));
    }
  };

  const off = usage !== null && !usage.available;
  const spent = usage !== null && usage.available && usage.used >= usage.limit;
  const shown = results ? (noSiteFirst ? [...results.prospects].sort((a, b) => Number(a.website !== null) - Number(b.website !== null)) : results.prospects) : [];
  const withoutSite = results?.prospects.filter((p) => !p.website).length ?? 0;
  const withEmail = results?.prospects.filter((p) => p.website && contacts[p.website]?.emails.length).length ?? 0;
  const notInCrm = results?.prospects.filter((p) => !p.inCrm.length) ?? [];

  return (
    <div className="space-y-4 lg:space-y-6">
      <Card>
        <CardHeader>
          <CardIcon>
            <MapPinIcon />
          </CardIcon>
          <CardTitle>Find prospects near you</CardTitle>
          <CardDescription>
            Pick who you sell to and where, and get local businesses 20 at a time (up to 60) with their phone, email, website, social pages, hours and rating. Businesses with no website come first: they need you most.
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
                  {withoutSite ? `${withoutSite} have no website. ` : ""}
                  {reading ? "Looking for emails on their websites… " : withEmail ? `${withEmail} have an email on their website. ` : ""}
                  Check a site to get a report to send with your first email.
                </CardDescription>
              )}
            </div>
            {results.prospects.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={!targets.length || reading || !notInCrm.length || adding.size > 0}
                  onClick={() => void add(notInCrm)}
                >
                  {adding.size > 1 ? <Spinner data-icon="inline-start" /> : <PlusIcon data-icon="inline-start" />}
                  {notInCrm.length ? "Add all to CRM" : "All in CRM"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setNoSiteFirst((v) => !v)}>
                  {noSiteFirst ? "Google's order" : "No website first"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const url = URL.createObjectURL(new Blob([prospectsCsv(results.prospects, contacts)], { type: "text/csv;charset=utf-8" }));
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
            <CardContent className="space-y-3">
              <CrmLine crm={crm} mailbox={mailbox} onHighLevel={() => setHlOpen(true)} onMailbox={() => setMbOpen(true)} />
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
                      {(p.type || p.address) && (
                        <p className="text-muted-foreground truncate text-xs">{[p.type, p.address].filter(Boolean).join(" · ")}</p>
                      )}
                      {todaysHours(p.hours) && (
                        <p className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                          <ClockIcon className="size-3" aria-hidden />
                          {todaysHours(p.hours)}
                        </p>
                      )}
                      <ContactLine contacts={p.website ? contacts[p.website] : undefined} reading={reading && !!p.website && !contacts[p.website]} />
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
                          <Button variant="outline" size="sm" disabled={readingSite === p.id} onClick={() => void read(p)}>
                            {readingSite === p.id && <Spinner data-icon="inline-start" />}
                            <span className="sm:hidden">Read</span>
                            <span className="max-sm:hidden">Read Website</span>
                          </Button>
                        </>
                      )}
                      {p.inCrm.length ? (
                        <Badge variant="success" className="h-8 rounded-md px-2.5" title={`In ${p.inCrm.map((t) => CRM_LABEL[t]).join(" and ")}`}>
                          <CheckIcon />
                          In CRM
                        </Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!targets.length || adding.has(p.id) || (reading && !!p.website && !contacts[p.website])}
                          onClick={() => void add([p])}
                          aria-label={`Add ${p.name} to CRM`}
                        >
                          {adding.has(p.id) ? <Spinner data-icon="inline-start" /> : <PlusIcon data-icon="inline-start" />}
                          <span className="sm:hidden">Add</span>
                          <span className="max-sm:hidden">Add to CRM</span>
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-muted-foreground flex items-center gap-1 text-xs">
                  Results from Google Maps. Emails and profiles come from each business&apos;s own website. <ExternalLinkIcon className="size-3" aria-hidden />
                </p>
                {results.nextPageToken && (
                  <Button variant="outline" size="sm" onClick={loadMore} disabled={more || spent}>
                    {more && <Spinner data-icon="inline-start" />}
                    {more ? "Loading…" : "More results"}
                  </Button>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      )}
      <HighLevelConnect productId={productId} open={hlOpen} onOpenChange={setHlOpen} connected={!!crm?.highlevel.connected} onSaved={setCrm} />
      {crm?.fluentcrm.available && <MailboxConnect productId={productId} open={mbOpen} onOpenChange={setMbOpen} mailbox={mailbox} onChange={setMailbox} />}
    </div>
  );
}

/** Which CRMs "Add to CRM" sends to, with HighLevel's connect button. */
function CrmLine({
  crm,
  mailbox,
  onHighLevel,
  onMailbox
}: {
  crm: ProspectCrm | null;
  mailbox: ProspectMailbox | null;
  onHighLevel: () => void;
  onMailbox: () => void;
}) {
  if (!crm) return null;
  const into = [crm.fluentcrm.available && "your FluentCRM", crm.highlevel.connected && "HighLevel"].filter(Boolean).join(" and ");
  const box = mailbox?.state ?? "none";
  const sending = crm.fluentcrm.available
    ? box === "connected"
      ? ` Emails from FluentCRM to them go out from ${mailbox?.mailbox?.from}.`
      : " Emails from FluentCRM to them go out only once you connect your own mailbox."
    : "";
  return (
    <div className="bg-muted/50 flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs">
      <p className="text-muted-foreground min-w-0 flex-1 basis-64">
        {into
          ? `Add to CRM puts them in ${into}, tagged "Prospect". Nothing is emailed.${sending}`
          : (crm.fluentcrm.reason ?? "Connect HighLevel to add prospects to your CRM.")}
      </p>
      <div className="flex flex-wrap gap-2">
        {crm.fluentcrm.available && (
          <Button variant="outline" size="sm" className="h-7" onClick={onMailbox}>
            {box === "connected" ? (
              <>
                <MailIcon data-icon="inline-start" aria-hidden />
                Mailbox connected
              </>
            ) : box === "checking" ? (
              "Checking mailbox…"
            ) : box === "failed" ? (
              "Fix mailbox"
            ) : (
              "Connect your mailbox"
            )}
          </Button>
        )}
        <Button variant="outline" size="sm" className="h-7" onClick={onHighLevel}>
          {crm.highlevel.connected ? "HighLevel connected" : "Connect HighLevel"}
        </Button>
      </div>
    </div>
  );
}

/** A prospect's email and profiles from its website, once read. */
function ContactLine({ contacts, reading }: { contacts?: ProspectContacts; reading: boolean }) {
  if (reading) return <p className="text-muted-foreground text-xs">Looking for an email…</p>;
  if (!contacts || (!contacts.emails.length && !contacts.socials.length && !contacts.contactPage)) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-xs">
      {contacts.emails.map((email) => (
        <a key={email} href={`mailto:${email}`} className="text-foreground inline-flex items-center gap-1 underline-offset-2 hover:underline">
          <MailIcon className="size-3" aria-hidden />
          {email}
        </a>
      ))}
      {!contacts.emails.length && contacts.contactPage && (
        <a href={contacts.contactPage} target="_blank" rel="noreferrer" className="text-foreground inline-flex items-center gap-1 underline-offset-2 hover:underline">
          <MailIcon className="size-3" aria-hidden />
          Contact form
        </a>
      )}
      {contacts.socials.map((s) => {
        const Icon = NETWORK_ICON[s.network];
        return (
          <a key={s.network} href={s.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 underline-offset-2 hover:underline">
            <Icon className="size-3" aria-hidden />
            {NETWORK_LABEL[s.network]}
          </a>
        );
      })}
    </div>
  );
}
