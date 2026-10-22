import type { LucideIcon } from "lucide-react";

/** What a list shows before it has anything in it: what goes here, and the button that adds the first one. */
export function EmptyState({
  icon: Icon,
  title,
  children,
  action
}: {
  icon: LucideIcon;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center whitespace-normal">
      <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-full">
        <Icon className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="text-foreground font-medium">{title}</p>
        {children && <p className="text-muted-foreground mx-auto max-w-sm text-sm">{children}</p>}
      </div>
      {action}
    </div>
  );
}
