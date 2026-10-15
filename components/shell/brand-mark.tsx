import { ServerCogIcon } from "lucide-react";

/** The square AnyPress mark in the sidebar; it takes the accent color. */
export function BrandMark() {
  return (
    <span className="bg-primary text-primary-foreground me-1 flex size-8 shrink-0 items-center justify-center rounded-[5px] transition-all group-data-collapsible:size-6 group-data-[collapsible=icon]:size-8">
      <ServerCogIcon className="size-4" />
    </span>
  );
}
