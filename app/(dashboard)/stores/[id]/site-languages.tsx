"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { XIcon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import type { SiteLanguages } from "@/lib/api/types";
import { setTenantLanguages } from "../../actions";

const MAX_EXTRA = 9;

/**
 * The store in more than one language (Polylang, through AnyPress Client): on or off, which languages besides the
 * site's own, and how many pages each has. The owner sees and changes the same on Dashboard > Your plan in WordPress.
 */
export function SiteLanguagesPanel({
  tenantId,
  languages,
  canChange,
}: {
  tenantId: string;
  languages: SiteLanguages;
  canChange: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const own = languages.languages.find((l) => l.default);
  const saved = languages.languages
    .filter((l) => !l.default)
    .map((l) => l.locale);
  const [picked, setPicked] = React.useState<string[]>(saved);
  const choices = (languages.choices ?? []).filter(
    (c) => c.locale !== own?.locale && !picked.includes(c.locale),
  );
  const nameOf = (locale: string) =>
    languages.choices?.find((c) => c.locale === locale)?.name ??
    languages.languages.find((l) => l.locale === locale)?.name ??
    locale;
  const changed = picked.join() !== saved.join();

  const save = (on: boolean, list?: string[]) =>
    startTransition(async () => {
      const result = await setTenantLanguages(tenantId, on, list);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        on
          ? "Languages saved. The site sets them up in a few seconds."
          : "Languages is off. Translated pages stay as ordinary pages.",
      );
      router.refresh();
    });

  const toggle = (on: boolean) => {
    if (on && !picked.length) {
      toast.info("Pick a language below first, then turn Languages on.");
      return;
    }
    save(on, on ? picked : undefined);
  };

  if (!languages.available) {
    return (
      <p className="text-muted-foreground text-sm">
        This store was made before Languages. Stores made from the next template
        version have it.
      </p>
    );
  }

  return (
    <div className="space-y-4" data-testid="site-languages">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">
            {languages.on
              ? `In ${languages.languages.length} languages`
              : "One language"}
          </p>
          <p className="text-muted-foreground text-sm">
            {languages.on
              ? "Visitors pick a language from the menu. Each page can have a copy per language, at addresses like /es/."
              : `The site is in ${own?.name ?? "its own language"} only.`}
          </p>
        </div>
        {canChange ? (
          <Switch
            checked={languages.on}
            disabled={pending}
            onCheckedChange={toggle}
            aria-label="Languages"
          />
        ) : (
          <Badge variant={languages.on ? "success" : "outline"}>
            {languages.on ? "On" : "Off"}
          </Badge>
        )}
      </div>

      {languages.on && !languages.ready && (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Spinner /> Setting up: translation files are downloading.
        </p>
      )}

      {(own || picked.length > 0) && (
        <ul className="divide-y rounded-md border text-sm">
          {own && (
            <li className="flex items-center justify-between gap-3 px-3 py-2">
              <span>
                {own.name}{" "}
                <span className="text-muted-foreground">
                  (the site&apos;s own)
                </span>
              </span>
              {languages.ready && (
                <span className="text-muted-foreground">
                  {own.pages ?? 0} pages
                </span>
              )}
            </li>
          )}
          {picked.map((locale) => {
            const live = languages.ready
              ? languages.languages.find((l) => l.locale === locale)
              : undefined;
            return (
              <li
                key={locale}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <span>{nameOf(locale)}</span>
                <span className="flex items-center gap-2">
                  {live && (
                    <span className="text-muted-foreground">
                      {live.pages ?? 0} pages
                    </span>
                  )}
                  {canChange && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      disabled={pending}
                      aria-label={`Remove ${nameOf(locale)}`}
                      onClick={() =>
                        setPicked(picked.filter((l) => l !== locale))
                      }
                    >
                      <XIcon />
                    </Button>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {canChange && (
        <div className="flex flex-wrap items-center gap-2">
          {picked.length < MAX_EXTRA && choices.length > 0 && (
            <Select
              value=""
              onValueChange={(locale) => setPicked([...picked, locale])}
              disabled={pending}
            >
              <SelectTrigger
                className="w-full sm:w-56"
                aria-label="Add a language"
              >
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
          )}
          {languages.on && changed && (
            <Button
              size="sm"
              disabled={pending || !picked.length}
              onClick={() => save(true, picked)}
            >
              {pending && <Spinner />}
              Save languages
            </Button>
          )}
        </div>
      )}
      <p className="text-muted-foreground text-xs">
        Buttons and screens of the site&apos;s plugins follow the visitor&apos;s
        language. Page text is translated per page, by you or the AI assistant.
      </p>
    </div>
  );
}
