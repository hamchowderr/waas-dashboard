"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardIcon, CardTitle } from "@/components/ui/card";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardIcon className="bg-rose-600/12 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300">
          <AlertTriangle />
        </CardIcon>
        <CardTitle>Could not load this page</CardTitle>
        <CardDescription>
          The provisioning API did not answer as expected. It may be down, or the dashboard&apos;s
          WAAS_API_URL or WAAS_ADMIN_TOKEN may be wrong.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error.digest && (
          <p className="text-muted-foreground font-mono text-xs">Reference: {error.digest}</p>
        )}
        <Button onClick={reset}>Try again</Button>
      </CardContent>
    </Card>
  );
}
