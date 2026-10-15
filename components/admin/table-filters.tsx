"use client";

import * as React from "react";
import { ListFilterIcon, SearchIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";

/** A column the list can be narrowed by: pick any of its values. */
export type TableFacet = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  options: { value: string; label: string }[];
};

/** The search text plus the picked values per facet id. Empty means no constraint. */
export type TableFilterState = { search: string; facets: Record<string, string[]> };

export const EMPTY_FILTERS: TableFilterState = { search: "", facets: {} };

export function isFiltered(state: TableFilterState) {
  return state.search.trim() !== "" || Object.values(state.facets).some((values) => values.length > 0);
}

/**
 * Whether a row passes the search and every facet. The search matches
 * `readField(row, "search")`, so each page decides which properties it covers.
 */
export function matchesFilters<T>(
  row: T,
  state: TableFilterState,
  readField: (row: T, id: string) => unknown
): boolean {
  const needle = state.search.trim().toLowerCase();
  if (needle && !String(readField(row, "search") ?? "").toLowerCase().includes(needle)) return false;
  return Object.entries(state.facets).every(
    ([id, values]) => values.length === 0 || values.includes(String(readField(row, id)))
  );
}

/** The "Filters" button: one submenu per facet, each value with its row count. */
export function TableFilterMenu<T>({
  rows,
  facets,
  readField,
  value,
  onChange
}: {
  /** Every row before filtering, for the counts. */
  rows: T[];
  facets: TableFacet[];
  readField: (row: T, id: string) => unknown;
  value: TableFilterState;
  onChange: (next: TableFilterState) => void;
}) {
  const active = Object.values(value.facets).reduce((sum, values) => sum + values.length, 0);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <ListFilterIcon /> Filters
          {active > 0 && (
            <Badge variant="secondary" className="-me-1 h-4.5 min-w-4.5 px-1 tabular-nums">
              {active}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {facets.map((facet) => {
          const selected = value.facets[facet.id] ?? [];
          const counts = countValues(rows, facet.id, readField);
          return (
            <DropdownMenuSub key={facet.id}>
              <DropdownMenuSubTrigger>
                {facet.icon}
                {facet.label}
                {selected.length > 0 && (
                  <span className="text-muted-foreground ms-auto text-xs tabular-nums">{selected.length}</span>
                )}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-80 w-60 overflow-y-auto">
                {facet.options.map((option) => (
                  <DropdownMenuCheckboxItem
                    key={option.value}
                    checked={selected.includes(option.value)}
                    // Keep the menu open so several values can be picked in a row.
                    onSelect={(event) => event.preventDefault()}
                    onCheckedChange={(checked) =>
                      onChange(
                        withFacet(
                          value,
                          facet.id,
                          checked ? [...selected, option.value] : selected.filter((v) => v !== option.value)
                        )
                      )
                    }>
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    <span className="text-muted-foreground font-mono text-xs tabular-nums">
                      {counts.get(option.value) ?? 0}
                    </span>
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          );
        })}
        {active > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onChange({ ...value, facets: {} })}>Clear filters</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** One removable chip per facet in use, e.g. "Status: Ready, Pending". */
export function TableFilterChips({
  facets,
  value,
  onChange
}: {
  facets: TableFacet[];
  value: TableFilterState;
  onChange: (next: TableFilterState) => void;
}) {
  return facets.map((facet) => {
    const picked = facet.options.filter((option) => value.facets[facet.id]?.includes(option.value));
    if (picked.length === 0) return null;
    return (
      <span
        key={facet.id}
        className="bg-muted/60 inline-flex h-7 max-w-72 items-center gap-1 rounded-[min(var(--radius-md),12px)] border ps-2.5 pe-0.5 text-[0.8rem]">
        <span className="text-muted-foreground shrink-0">{facet.label}:</span>
        <span className="truncate font-medium">
          {picked.length > 2 ? `${picked.length} selected` : picked.map((option) => option.label).join(", ")}
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground"
          aria-label={`Remove ${facet.label.toLowerCase()} filter`}
          onClick={() => onChange(withFacet(value, facet.id, []))}>
          <XIcon />
        </Button>
      </span>
    );
  });
}

export function TableSearch({
  placeholder,
  value,
  onChange,
  className
}: {
  placeholder: string;
  value: TableFilterState;
  onChange: (next: TableFilterState) => void;
  className?: string;
}) {
  return (
    <InputGroup className={cn("h-7", className)}>
      <InputGroupAddon>
        <SearchIcon className="size-3.5" />
      </InputGroupAddon>
      <InputGroupInput
        type="search"
        value={value.search}
        onChange={(event) => onChange({ ...value, search: event.target.value })}
        placeholder={placeholder}
        aria-label="Search"
        className="text-[0.8rem] [&::-webkit-search-cancel-button]:hidden"
      />
      {value.search && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="icon-xs" onClick={() => onChange({ ...value, search: "" })} aria-label="Clear search">
            <XIcon />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}

function withFacet(state: TableFilterState, id: string, values: string[]): TableFilterState {
  return { ...state, facets: { ...state.facets, [id]: values } };
}

function countValues<T>(rows: T[], id: string, readField: (row: T, id: string) => unknown) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = String(readField(row, id));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}
