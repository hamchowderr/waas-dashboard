import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>Not found</CardTitle>
        <CardDescription>This store does not exist, or it has been deleted.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline">
          <Link href="/stores">Back to stores</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
