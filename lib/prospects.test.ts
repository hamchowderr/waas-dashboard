import { describe, expect, it } from "vitest";

import { contactsFrom, mergeContacts } from "./prospect-contacts";
import { prospectsCsv } from "./prospects";

const bakery = {
  id: "1",
  name: 'Joe\'s "Best" Bakery',
  address: "1 Main St, Columbus, OH",
  phone: "(614) 555-0100",
  website: "https://joes.example/",
  rating: 4.6,
  reviews: 12,
  mapsUrl: "https://maps.example/1",
  type: "Bakery",
  hours: ["Monday: 7 AM – 3 PM", "Sunday: Closed"],
  inCrm: []
};

describe("prospectsCsv", () => {
  it("writes every column and quotes cells with commas or quotes", () => {
    const csv = prospectsCsv([bakery], {
      "https://joes.example/": { emails: ["hi@joes.example"], contactPage: "https://joes.example/contact", socials: [{ network: "instagram", url: "https://instagram.com/joes" }] }
    });
    const [header, row] = csv.trim().split("\n");
    expect(header).toBe("Name,Type,Phone,Email,Website,Contact page,Facebook,Instagram,LinkedIn,X,YouTube,TikTok,Address,Rating,Reviews,Hours,Google Maps");
    expect(row).toBe(
      '"Joe\'s ""Best"" Bakery",Bakery,(614) 555-0100,hi@joes.example,https://joes.example/,https://joes.example/contact,,https://instagram.com/joes,,,,,"1 Main St, Columbus, OH",4.6,12,Monday: 7 AM – 3 PM; Sunday: Closed,https://maps.example/1'
    );
  });

  it("leaves contact columns empty before the websites are read", () => {
    expect(prospectsCsv([{ ...bakery, website: null, hours: null }]).trim().split("\n")[1]).toContain(",(614) 555-0100,,,,");
  });
});

describe("contactsFrom", () => {
  const page = `<html><body>
    <a href="mailto:Office@GraceChurch.org?subject=Hi">Email us</a>
    <p>Pastor: pastor&#64;gracechurch.org or design@webagency.com</p>
    <img src="logo@2x.png"> <script>var e = "noreply@sentry.io"</script>
    <a href="/contact-us/">Contact</a>
    <a href="https://www.facebook.com/gracechurch?ref=home">Facebook</a>
    <a href="https://www.facebook.com/sharer/sharer.php?u=x">Share</a>
    <a href="https://instagram.com/gracecols/">IG</a>
    <a href="https://twitter.com/intent/tweet">Tweet</a>
  </body></html>`;

  it("finds the site's emails first, its contact page and its profiles", () => {
    const found = contactsFrom(page, "https://www.gracechurch.org/");
    expect(found.emails).toEqual(["office@gracechurch.org", "pastor@gracechurch.org", "design@webagency.com"]);
    expect(found.contactPage).toBe("https://www.gracechurch.org/contact-us/");
    expect(found.socials).toEqual([
      { network: "facebook", url: "https://www.facebook.com/gracechurch" },
      { network: "instagram", url: "https://instagram.com/gracecols/" }
    ]);
  });

  it("reads Cloudflare-hidden addresses and skips junk", () => {
    const found = contactsFrom('<span data-cfemail="5b32353d341b3c293a383e7534293c">x</span> <a href="mailto:you@example.com">x</a>', "https://grace.org/");
    expect(found.emails).toEqual(["info@grace.org"]);
  });

  it("joins two pages without repeats", () => {
    const a = { emails: [], contactPage: "https://x.org/contact", socials: [{ network: "facebook" as const, url: "https://facebook.com/x" }] };
    const b = { emails: ["hi@x.org"], contactPage: null, socials: [{ network: "facebook" as const, url: "https://facebook.com/other" }] };
    expect(mergeContacts(a, b)).toEqual({ emails: ["hi@x.org"], contactPage: "https://x.org/contact", socials: a.socials });
  });
});
