"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { XIcon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import type { SiteLanguage, SiteLanguages } from "@/lib/api/types";
import { setTenantLanguages } from "../../actions";

const MAX_EXTRA = 9;

function LanguageRow({ name, note, pages, onRemove, disabled }: { name: string; note?: string; pages?: number; onRemove?: () => void; disabled: boolean }) {
  return (
    <li data-slot="tile" className="bg-muted flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 py-1.5">
      <span>
        {name} {note && <span className="text-muted-foreground">{note}</span>}
      </span>
      <span className="flex items-center gap-2">
        {pages !== undefined && <span className="text-muted-foreground">{pages} pages</span>}
        {onRemove && (
          <Button variant="ghost" size="icon-sm" disabled={disabled} aria-label={`Remove ${name}`} onClick={onRemove}>
            <XIcon />
          </Button>
        )}
      </span>
    </li>
  );
}

function AddLanguage({ choices, onAdd, disabled }: { choices: { locale: string; name: string }[]; onAdd: (locale: string) => void; disabled: boolean }) {
  return (
    <Select value="" onValueChange={onAdd} disabled={disabled}>
      <SelectTrigger className="w-full sm:w-56" aria-label="Add a language">
        <SelectValue placeholder="Add a language" />
      </SelectTrigger>
      <SelectContent>
        {choices.map((c) => (
          <SelectItem key={c.locale} value={c.locale}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Summary({ languages, own }: { languages: SiteLanguages; own?: SiteLanguage }) {
  return (
    <div className="space-y-0.5">
      <p className="text-sm font-medium">{languages.on ? `In ${languages.languages.length} languages` : "One language"}</p>
      <p className="text-muted-foreground text-sm">
        {languages.on
          ? "Visitors pick a language from the menu. Each page can have a copy per language, at addresses like /es/."
          : `The site is in ${own?.name ?? "its own language"} only.`}
      </p>
    </div>
  );
}

/** Saves the store's languages with a toast either way, then reloads the page's data. */
function useSaveLanguages(tenantId: string) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const save = (on: boolean, list?: string[]) =>
    startTransition(async () => {
      const result = await setTenantLanguages(tenantId, on, list);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(on ? "Languages saved. The site sets them up in a few seconds." : "Languages is off. Translated pages stay as ordinary pages.");
      router.refresh();
    });
  return { pending, save };
}

/**
 * The store in more than one language (Polylang, through AnyPress Client): on or off, which languages besides the
 * site's own, and how many pages each has. The owner sees and changes the same on Dashboard > Your plan in WordPress.
 */
export function SiteLanguagesPanel({ tenantId, languages, canChange }: { tenantId: string; languages: SiteLanguages; canChange: boolean }) {
  const { pending, save } = useSaveLanguages(tenantId);
  const own = languages.languages.find((l) => l.default);
  const saved = languages.languages.filter((l) => !l.default).map((l) => l.locale);
  const [picked, setPicked] = React.useState<string[]>(saved);
  const choices = (languages.choices ?? []).filter((c) => c.locale !== own?.locale && !picked.includes(c.locale));
  const nameOf = (locale: string) => languages.choices?.find((c) => c.locale === locale)?.name ?? languages.languages.find((l) => l.locale === locale)?.name ?? locale;
  const pagesOf = (locale: string) => (languages.ready ? languages.languages.find((l) => l.locale === locale)?.pages ?? 0 : undefined);

  const toggle = (on: boolean) => {
    if (on && !picked.length) toast.info("Pick a language below first, then turn Languages on.");
    else save(on, on ? picked : undefined);
  };

  if (!languages.available) {
    return <p className="text-muted-foreground text-sm">This store was made before Languages. Stores made from the next template version have it.</p>;
  }

  return (
    <div className="space-y-4" data-testid="site-languages">
      <div className="flex items-center justify-between gap-3">
        <Summary languages={languages} own={own} />
        {canChange ? (
          <Switch checked={languages.on} disabled={pending} onCheckedChange={toggle} aria-label="Languages" />
        ) : (
          <Badge variant={languages.on ? "success" : "outline"}>{languages.on ? "On" : "Off"}</Badge>
        )}
      </div>

      {languages.on && !languages.ready && (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Spinner /> Setting up: translation files are downloading.
        </p>
      )}

      <ul className="space-y-1.5 text-sm">
        {own && <LanguageRow name={own.name} note="(the site's own)" pages={pagesOf(own.locale)} disabled={pending} />}
        {picked.map((locale) => (
          <LanguageRow
            key={locale}
            name={nameOf(locale)}
            pages={pagesOf(locale)}
            disabled={pending}
            onRemove={canChange ? () => setPicked(picked.filter((l) => l !== locale)) : undefined}
          />
        ))}
      </ul>

      {canChange && (
        <div className="flex flex-wrap items-center gap-2">
          {picked.length < MAX_EXTRA && choices.length > 0 && <AddLanguage choices={choices} onAdd={(locale) => setPicked([...picked, locale])} disabled={pending} />}
          {languages.on && picked.join() !== saved.join() && (
            <Button size="sm" disabled={pending || !picked.length} onClick={() => save(true, picked)}>
              {pending && <Spinner />}
              Save languages
            </Button>
          )}
        </div>
      )}
      <p className="text-muted-foreground text-sm">
        Buttons and screens of the site&apos;s plugins follow the visitor&apos;s language. Page text is translated per page, by you or the AI assistant.
      </p>
    </div>
  );
}
