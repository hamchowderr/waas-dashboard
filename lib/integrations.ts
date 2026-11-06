/**
 * Every way a seller or reseller can connect AnyPress to the tools they already use, for the Integrations page.
 * Each one says what it does, where to set it up and which guide walks through it. Guides are on the shop's docs.
 */

const DOCS = "https://shop.anypress.io/docs";

/** The API's public address: the MCP connector and the API both live there. Self-hosters set their own. */
export const publicApiUrl = () => (process.env.WAAS_PUBLIC_API_URL ?? "https://api.anypress.io").replace(/\/+$/, "");

export type IntegrationLink = { label: string; href: string };

export type Integration = {
  id: string;
  name: string;
  /** One or two sentences on what it does for a seller. */
  summary: string;
  /** The guide that sets it up. */
  guide: IntegrationLink;
  /** Where in the dashboard (or elsewhere) it is turned on, when that is not the guide itself. */
  action?: IntegrationLink;
  /** Each company's own logo (files in public/integrations/), shown on the card. */
  logos?: { src: string; alt: string }[];
  /** A short label such as "In review", shown beside the name. */
  note?: string;
};

export type IntegrationGroup = { id: string; title: string; description: string; items: Integration[] };

export const INTEGRATION_GROUPS: IntegrationGroup[] = [
  {
    id: "ai",
    title: "AI apps",
    description: "Run your stores by asking in plain words, from any AI app or code editor that supports MCP.",
    items: [
      {
        id: "mcp",
        logos: [
          { src: "/integrations/claude.svg", alt: "Claude" },
          { src: "/integrations/openai.svg", alt: "ChatGPT" },
          { src: "/integrations/cursor.svg", alt: "Cursor" },
          { src: "/integrations/githubcopilot.svg", alt: "GitHub Copilot" },
          { src: "/integrations/gemini.svg", alt: "Gemini" },
          { src: "/integrations/windsurf.svg", alt: "Windsurf" }
        ],
        name: "AnyPress connector (MCP)",
        summary:
          "Works in any app that connects to MCP servers, such as Claude, ChatGPT, Cursor, VS Code with GitHub Copilot, Gemini and Windsurf. Add the address below and sign in to AnyPress; an app that can't sign in can use your API key and secret instead. It can then make and back up sites, add domains, and edit a site's pages and design, with the rights your role on the team gives you.",
        guide: { label: "Connect an AI app", href: `${DOCS}/connect-an-ai-app-to-anypress/` },
        action: { label: "What to ask", href: "https://anypress.io/ai" }
      }
    ]
  },
  {
    id: "automation",
    title: "Automation apps",
    description: "Make a client's site from a form, a payment or a won deal, and start a flow the moment a site is ready.",
    items: [
      {
        id: "n8n",
        logos: [{ src: "/integrations/n8n.svg", alt: "n8n" }],
        name: "n8n",
        summary: "The AnyPress node creates, finds, suspends, resumes and deletes sites, and its trigger starts a workflow when a site is ready.",
        guide: { label: "Use AnyPress in n8n", href: `${DOCS}/use-anypress-in-n8n/` }
      },
      {
        id: "zapier",
        logos: [{ src: "/integrations/zapier.svg", alt: "Zapier" }],
        name: "Zapier",
        summary: "The AnyPress app runs the same steps in a Zap: make a site after a Stripe payment or a booking, and email the client when it's live.",
        guide: { label: "Use AnyPress in Zapier", href: `${DOCS}/use-anypress-in-zapier/` }
      },
      {
        id: "make",
        logos: [{ src: "/integrations/make.svg", alt: "Make" }],
        name: "Make",
        summary: "The AnyPress app for Make scenarios, with ready-made blueprints for a CRM deal, a payment and a cancelled plan.",
        guide: { label: "Use AnyPress in Make", href: `${DOCS}/use-anypress-in-make/` }
      },
      {
        id: "highlevel",
        logos: [{ src: "/integrations/highlevel.svg", alt: "HighLevel" }],
        name: "HighLevel",
        summary: "Create a site from a HighLevel workflow for each sub-account's client, and start a workflow when it's ready.",
        guide: { label: "Use AnyPress in HighLevel", href: `${DOCS}/use-anypress-in-highlevel/` },
        note: "Marketplace listing in review"
      }
    ]
  },
  {
    id: "developers",
    title: "Build your own",
    description: "For your own app or a tool not listed here. Every call signs in with your storefront's API key and secret.",
    items: [
      {
        id: "api",
        name: "AnyPress API",
        summary: "Create your first site from code in three calls, then manage sites, backups and domains. TypeScript and PHP SDKs are ready to install.",
        guide: { label: "API quickstart", href: `${DOCS}/api-quickstart/` },
        action: { label: "Get an API key", href: "/keys" }
      },
      {
        id: "webhooks",
        name: "Webhooks",
        summary: "Get a signed message whenever a store on your storefront changes, such as the moment it's ready, to email the client or update your own records.",
        guide: { label: "Email the client when their site is ready", href: `${DOCS}/email-the-client-when-their-site-is-ready/` },
        action: { label: "Add a webhook", href: "/webhooks" }
      }
    ]
  }
];
