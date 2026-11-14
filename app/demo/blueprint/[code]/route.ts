import { prospectBlueprint, prospectDemo } from "@/lib/prospect-demo";

/** A prospect demo's Playground blueprint, which demo.anypress.site loads (blueprint-url) for the seller's demo page. */
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const demo = await prospectDemo(code);
  const blueprint = demo ? await prospectBlueprint(demo) : null;
  const headers = { "Access-Control-Allow-Origin": "*", "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "public, max-age=300" };
  if (!blueprint) return Response.json({ message: "Not found" }, { status: 404, headers: { ...headers, "Cache-Control": "no-store" } });
  return Response.json(blueprint, { headers });
}
