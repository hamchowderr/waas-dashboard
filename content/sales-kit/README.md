# Sales kit

What the dashboard's Sell page shows sellers and resellers: one playbook per customer group, plus guides every group shares. Sellers' customers must never see the platform's name, so nothing in here says it. Every file is Markdown with placeholders the Sell page fills in from the storefront's branding and prices.

| Placeholder | Filled with |
|---|---|
| `{{brand}}` | The storefront's brand name (Branding page), else its name |
| `{{shop}}` | The storefront's shop address |
| `{{sender}}` | The signed-in person's name |
| `{{support}}` | The storefront's support email |
| `{{price.website}}`, `{{price.bookings}}`, `{{price.store}}`, `{{price.community}}`, `{{price.everything}}` | The seller's own monthly price for each plan, or the suggested price when none is set |
| `{{demo}}` | The live demo link for the playbook's plan |
| `{{plan}}`, `{{price}}` | In the call script: the playbook's plan name and the seller's price for it |
| `{{prices.costs}}`, `{{prices.suggested}}`, `{{prices.tiers}}`, `{{prices.sizes}}`, `{{prices.yearly}}`, `{{prices.free}}`, `{{prices.wholesale}}`, `{{prices.example}}` | Guides only: the cost and suggested price tables and the volume, size, yearly and reseller terms, from the price list, so a guide never types a price |
| `{{prospect}}`, `{{business}}`, `{{city}}`, `{{day}}`, `{{marketplace}}` (where a shop sells today, such as Etsy) | Left for the seller to fill per message |

## Files

- `groups/<id>.md`: one playbook per customer group. The ids match the CRM's customer group field: `shops`, `regulated`, `courses`, `chambers`, `churches`, `franchises`, `agencies`, `developers`.
- `guides/pricing.md`: what to charge and what you keep.
- `guides/objections.md`: answers to what prospects say.
- `guides/call-script.md`: a first call, start to finish.
- `guides/onboarding.md`: from yes to a live site.

Each playbook has the same parts in the same order, so the Sell page can show them as tabs: Who, Where to find them, What to lead with, Offer, Outreach (emails, texts, social), Objections, Demo.
