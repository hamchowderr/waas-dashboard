export function PageHeader({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div data-slot="page-header" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0 space-y-1">
        <h1 data-slot="page-title" className="text-2xl font-extrabold tracking-[-0.03em] lg:text-[2rem] lg:leading-tight">{title}</h1>
        {description && <p className="text-muted-foreground max-w-prose text-sm text-pretty">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2 max-sm:self-start">{children}</div>}
    </div>
  );
}
