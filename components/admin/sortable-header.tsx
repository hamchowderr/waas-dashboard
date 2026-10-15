"use client";

import * as React from "react";
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

/** A column header that sorts on click: ascending first, then flips. */
export function SortableHeader({
  column,
  children
}: {
  column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | "asc" | "desc" };
  children: React.ReactNode;
}) {
  const sorted = column.getIsSorted();
  const Icon = sorted === "asc" ? ArrowUpIcon : sorted === "desc" ? ArrowDownIcon : ChevronsUpDownIcon;
  return (
    <Button variant="ghost" size="sm" className="-ms-2.5" onClick={() => column.toggleSorting(sorted === "asc")}>
      {children}
      <Icon className={sorted ? "size-3.5" : "size-3.5 opacity-50"} />
    </Button>
  );
}
