import { ServerCogIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** A centred card for the account pages outside the dashboard: no storefront yet, invitations. */
export function AccountCard({
  title,
  description,
  children
}: {
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center justify-center gap-2 font-semibold">
          <ServerCogIcon className="size-5" />
          AnyPress
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">{children}</CardContent>
        </Card>
      </div>
    </main>
  );
}
