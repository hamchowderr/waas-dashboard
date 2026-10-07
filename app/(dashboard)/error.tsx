"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="text-destructive size-5" />
          Could not load this page
        </CardTitle>
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
