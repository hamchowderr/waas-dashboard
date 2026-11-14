import { SearchXIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardIcon } from "@/components/ui/card";

export default function NotFound() {
  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardIcon>
          <SearchXIcon />
        </CardIcon>
        <CardTitle>Not found</CardTitle>
        <CardDescription>This page doesn&apos;t exist, or what it showed has been deleted.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline">
          <Link href="/">Back to Overview</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
