import { describe, expect, it } from "vitest";

import { prospectsCsv } from "./prospects";

describe("prospectsCsv", () => {
  it("writes a header and quotes cells with commas or quotes", () => {
    const csv = prospectsCsv([
      { id: "1", name: 'Joe\'s "Best" Bakery', address: "1 Main St, Columbus, OH", phone: "(614) 555-0100", website: null, rating: 4.6, reviews: 12, mapsUrl: "https://maps.example/1" }
    ]);
    expect(csv).toBe(
      'Name,Phone,Website,Address,Rating,Reviews,Google Maps\n"Joe\'s ""Best"" Bakery",(614) 555-0100,,"1 Main St, Columbus, OH",4.6,12,https://maps.example/1\n'
    );
  });
});
