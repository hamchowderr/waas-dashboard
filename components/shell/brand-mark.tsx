import { ServerCogIcon } from "lucide-react";

/** The AnyPress ribbon "A", the platform's own mark in the sidebar and on the sign-in page. */
export function BrandMark({ className = "size-8" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/anypress-mark.svg"
      alt=""
      aria-hidden
      className={`me-1 shrink-0 transition-all group-data-collapsible:size-6 group-data-[collapsible=icon]:size-8 ${className}`}
    />
  );
}

/** A seller's or reseller's brand with a name but no logo: a plain tile in their accent colour, never our mark. */
export function PlainMark() {
  return (
    <span className="bg-primary text-primary-foreground me-1 flex size-8 shrink-0 items-center justify-center rounded-[5px] transition-all group-data-collapsible:size-6 group-data-[collapsible=icon]:size-8">
      <ServerCogIcon className="size-4" />
    </span>
  );
}
