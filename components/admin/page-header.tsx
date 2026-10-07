export function PageHeader({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-row items-center justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight lg:text-2xl">{title}</h1>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>
      {children}
    </div>
  );
}
