"use client";

// The list used by every admin page: tabs, search and per-column filter menus, a column
// picker, pagination, and row checkboxes for pages that have bulk actions. Below lg the
// rows show as a list of cards instead (no table to scroll sideways), with the tabs as a
// select and the sortable columns in a sort menu.

import * as React from "react";
import { flexRender } from "@tanstack/react-table";
import {
  type LegacyColumnDef as ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useLegacyTable as useReactTable
} from "@tanstack/react-table/legacy";
import type { RowData, SortingState, ColumnVisibilityState as VisibilityState } from "@tanstack/table-core";
import { ArrowUpDownIcon, ChevronLeftIcon, ChevronRightIcon, Columns3Icon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  EMPTY_FILTERS,
  matchesFilters,
  TableFilterChips,
  TableFilterMenu,
  TableSearch,
  type TableFacet,
  type TableFilterState
} from "@/components/admin/table-filters";

export type TableTab<T extends RowData> = { value: string; label: string; match: (row: T) => boolean };

export type AdminDataTableProps<T extends RowData> = {
  data: T[];
  columns: ColumnDef<T>[];
  columnLabels: Record<string, string>;
  getRowId: (row: T) => string;
  /** Placeholder for the search box, naming what it searches. */
  searchPlaceholder: string;
  facets: TableFacet[];
  /** A row's value for a facet id, or its searchable text for "search". */
  readField: (row: T, path: string) => unknown;
  tabs?: TableTab<T>[];
  /** Show the number of rows on each tab. */
  tabCounts?: boolean;
  initialTab?: string;
  initialSorting?: SortingState;
  emptyText: string;
  onRowClick?: (row: T) => void;
  /** Rows that get a checkbox. Without it the table has no selection. */
  selectable?: (row: T) => boolean;
  /** The toolbar shown while rows are selected. */
  bulkActions?: (selected: T[], clearSelection: () => void) => React.ReactNode;
};

export function AdminDataTable<T extends RowData>({
  data,
  columns,
  columnLabels,
  getRowId,
  searchPlaceholder,
  facets,
  readField,
  tabs,
  tabCounts = false,
  initialTab = "all",
  initialSorting = [],
  emptyText,
  onRowClick,
  selectable,
  bulkActions
}: AdminDataTableProps<T>) {
  const [filters, setFilters] = React.useState<TableFilterState>(EMPTY_FILTERS);
  const [tab, setTab] = React.useState(initialTab);
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const allColumns = React.useMemo<ColumnDef<T>[]>(
    () =>
      selectable
        ? [
            {
              id: "select",
              header: ({ table }) => (
                <Checkbox
                  checked={
                    table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")
                  }
                  onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                  aria-label="Select all"
                />
              ),
              cell: ({ row }) =>
                row.getCanSelect() ? (
                  <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    onClick={(event) => event.stopPropagation()}
                    aria-label="Select row"
                  />
                ) : null,
              enableSorting: false,
              enableHiding: false
            },
            ...columns
          ]
        : columns,
    [columns, selectable]
  );

  const filtered = React.useMemo(
    () => data.filter((row) => matchesFilters(row, filters, readField)),
    [data, filters, readField]
  );
  const rows = React.useMemo(() => {
    const active = tabs?.find((t) => t.value === tab);
    return active ? filtered.filter(active.match) : filtered;
  }, [filtered, tabs, tab]);

  const table = useReactTable({
    data: rows,
    columns: allColumns,
    getRowId,
    enableRowSelection: selectable ? (row) => selectable(row.original) : false,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
    state: { sorting, columnVisibility, rowSelection }
  });

  const selected = table.getSelectedRowModel().rows.map((row) => row.original);
  const sortable = table.getAllLeafColumns().filter((column) => column.getCanSort() && columnLabels[column.id]);
  const changeFilters = (next: TableFilterState) => {
    setFilters(next);
    // Back to page one on every change: a narrower list can leave the current page past its end.
    table.setPageIndex(0);
  };
  const changeTab = (value: string) => {
    setTab(value);
    table.setPageIndex(0);
    table.resetRowSelection();
  };

  const { pageIndex, pageSize } = table.getState().pagination;
  const pageCount = table.getPageCount();
  const firstRow = rows.length === 0 ? 0 : pageIndex * pageSize + 1;
  const lastRow = Math.min((pageIndex + 1) * pageSize, rows.length);

  return (
    <Card>
      <CardContent className="flex flex-col p-0 [&_[data-slot=table-container]]:flex-1">
        <div className="flex min-h-14 flex-wrap items-center gap-2 border-b px-(--card-spacing) py-3">
          {selected.length > 0 && bulkActions ? (
            <>
              <span className="px-1 text-sm font-medium">{selected.length} selected</span>
              {bulkActions(selected, () => table.resetRowSelection())}
              <Button variant="outline" size="sm" className="ms-auto" onClick={() => table.resetRowSelection()}>
                Cancel
              </Button>
            </>
          ) : (
          <>
          {tabs && (
            <Select value={tab} onValueChange={changeTab}>
              <SelectTrigger size="sm" className="w-fit lg:hidden" aria-label="Show">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All{tabCounts && ` (${filtered.length})`}</SelectItem>
                {tabs.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                    {tabCounts && ` (${filtered.filter(t.match).length})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {tabs && (
            <Tabs value={tab} onValueChange={changeTab} className="hidden lg:block">
              <TabsList>
                <TabsTrigger value="all" className="gap-2">
                  All
                  {tabCounts && <TabCount count={filtered.length} />}
                </TabsTrigger>
                {tabs.map((t) => (
                  <TabsTrigger key={t.value} value={t.value} className="gap-2">
                    {t.label}
                    {tabCounts && <TabCount count={filtered.filter(t.match).length} />}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
          <TableFilterMenu rows={data} facets={facets} readField={readField} value={filters} onChange={changeFilters} />
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <TableFilterChips facets={facets} value={filters} onChange={changeFilters} />
          </div>
          <TableSearch
            placeholder={searchPlaceholder}
            value={filters}
            onChange={changeFilters}
            className="max-sm:order-last max-sm:w-full sm:w-56 xl:w-64"
          />
          </>
          )}
          {sortable.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon-sm" className="lg:hidden">
                  <ArrowUpDownIcon />
                  <span className="sr-only">Sort</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={sorting[0] ? `${sorting[0].id}:${sorting[0].desc ? "desc" : "asc"}` : ""}
                  onValueChange={(value) => {
                    const [id, direction] = value.split(":");
                    setSorting([{ id, desc: direction === "desc" }]);
                  }}>
                  {sortable.flatMap((column) => [
                    <DropdownMenuRadioItem key={`${column.id}:asc`} value={`${column.id}:asc`}>
                      {columnLabels[column.id]}, ascending
                    </DropdownMenuRadioItem>,
                    <DropdownMenuRadioItem key={`${column.id}:desc`} value={`${column.id}:desc`}>
                      {columnLabels[column.id]}, descending
                    </DropdownMenuRadioItem>
                  ])}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Columns3Icon />
                <span className="hidden lg:inline">Columns</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(value)}>
                    {columnLabels[column.id] ?? column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <ul className="grid gap-3 p-(--card-spacing) md:grid-cols-2 lg:hidden">
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => {
              const cells = row.getVisibleCells();
              const check = cells.find((cell) => cell.column.id === "select");
              const [title, ...details] = cells.filter((cell) => cell.column.id !== "select");
              return (
                <li
                  key={row.id}
                  data-slot="row-card"
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  className={cn(
                    "data-[state=selected]:bg-muted min-w-0 rounded-lg border p-3",
                    onRowClick && "hover:bg-muted/50 cursor-pointer"
                  )}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}>
                  <div className="flex items-start gap-3">
                    {check && (
                      <div className="pt-0.5" onClick={(event) => event.stopPropagation()}>
                        {flexRender(check.column.columnDef.cell, check.getContext())}
                      </div>
                    )}
                    {title && (
                      <div className="min-w-0 flex-1">{flexRender(title.column.columnDef.cell, title.getContext())}</div>
                    )}
                  </div>
                  {details.length > 0 && (
                    <dl className="mt-3 grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 text-sm">
                      {details.map((cell) => (
                        <React.Fragment key={cell.id}>
                          <dt className="text-muted-foreground">{columnLabels[cell.column.id] ?? cell.column.id}</dt>
                          <dd className="min-w-0 break-words">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </dd>
                        </React.Fragment>
                      ))}
                    </dl>
                  )}
                </li>
              );
            })
          ) : (
            <li className="text-muted-foreground py-8 text-center md:col-span-2">{emptyText}</li>
          )}
        </ul>

        <Table className="max-lg:hidden [&_td:first-child]:ps-(--card-spacing) [&_td:last-child]:pe-(--card-spacing) [&_th:first-child]:ps-(--card-spacing) [&_th:last-child]:pe-(--card-spacing)">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={onRowClick ? "cursor-pointer" : undefined}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={allColumns.length} className="text-muted-foreground h-24 text-center">
                  {emptyText}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex flex-col items-center justify-between gap-3 border-t px-(--card-spacing) py-3 sm:flex-row">
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            Rows per page
            <Select value={String(pageSize)} onValueChange={(value) => table.setPageSize(Number(value))}>
              <SelectTrigger size="sm" className="w-fit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="text-muted-foreground text-sm tabular-nums">
              {firstRow} - {lastRow} of {rows.length}
            </span>
            <div className="flex flex-wrap items-center justify-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}>
                <span className="sr-only">Previous page</span>
                <ChevronLeftIcon />
              </Button>
              {Array.from({ length: pageCount }, (_, index) => (
                <Button
                  key={index}
                  variant={index === pageIndex ? "outline" : "ghost"}
                  size="icon-sm"
                  className="tabular-nums"
                  onClick={() => table.setPageIndex(index)}>
                  {index + 1}
                </Button>
              ))}
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}>
                <span className="sr-only">Next page</span>
                <ChevronRightIcon />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TabCount({ count }: { count: number }) {
  return (
    <Badge variant="secondary" className="hidden h-5 min-w-5 px-1.5 tabular-nums sm:inline-flex">
      {count}
    </Badge>
  );
}
