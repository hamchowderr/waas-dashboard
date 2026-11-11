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

/** A seller's or reseller's brand with a name but no logo: its first letter on a tile in their accent colour, never our mark. */
export function PlainMark({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="bg-primary text-primary-foreground me-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-all group-data-collapsible:size-6 group-data-[collapsible=icon]:size-8">
      {name.trim().charAt(0).toUpperCase() || "A"}
    </span>
  );
}
