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
        name: "AnyPress connector (MCP)",
        summary:
          "Works in Claude, ChatGPT, Cursor, Copilot, Gemini, Devin Desktop and any other MCP app. Paste the address below and sign in, then ask it to make sites, back them up or edit their pages.",
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

export type AiPrompt = { title: string; text: string };

/** An AI app on the Integrations page: how to add the connector there, and prompts written for how it's used. */
export type AiApp = {
  id: string;
  name: string;
  /** In public/integrations/; none for "Any other app". */
  logo?: string;
  /** Where the connector goes in this app, in one or two sentences. */
  connect: string;
  prompts: AiPrompt[];
};

// Words in [brackets] are for the person to fill in before sending.
const SITE_PROMPTS = (ask: string): AiPrompt[] => [
  {
    title: "Build a website",
    text: `${ask} build a website for my business.

Business: [name, what you do, where you are]
Site type: [website / bookings / online store / community]
What I already have: [old site address, logo, photos, or nothing]

Start from the AnyPress theme kit that fits my industry. Write the words for the home, about, services and contact pages from what I've told you, keep every page as a draft, and show me each one before you publish anything.`
  },
  {
    title: "Check on all my sites",
    text: `${ask} check on all my sites. Tell me which are still building or failed, which have no backup from the last day, and which domains aren't connected yet. Give me a short list of anything that needs me, most urgent first.`
  },
  {
    title: "Add a section to a page",
    text: `${ask} back up [site name] first. Then add a pricing section to its home page with these plans: [plan names, prices and what each includes]. Build it from the theme's own sections, keep the page a draft and show me the change before it goes live.`
  },
  {
    title: "Connect a domain",
    text: `${ask} connect [yourdomain.com] to [site name]. Tell me exactly which DNS records to add at my domain registrar, then check again and tell me when the site is live on the domain with HTTPS.`
  },
  {
    title: "Get a design review",
    text: `${ask} look at [site name]'s home page and review it like a designer: the layout, the words, the images and what a visitor should do next. Suggest three changes, then make the one I pick as a draft.`
  }
];

const CODE_PROMPTS = (ask: string): AiPrompt[] => [
  {
    title: "Check the connection",
    text: `${ask} list my AnyPress sites with their status and address, so I know the connector is working. Then tell me which sites need attention.`
  },
  {
    title: "Make a site from my app",
    text: `In this codebase, when [event, for example a customer pays], create an AnyPress website for that customer. Read the AnyPress API quickstart first (${DOCS}/api-quickstart/) and use the official AnyPress TypeScript or PHP SDK it names. Keep the API key and secret in environment variables, wait until the site is ready, then [email the customer its address / save it to our database]. Add a test for it.`
  },
  {
    title: "Act on a webhook",
    text: `Add an endpoint to this app that receives AnyPress webhooks. Check each message's signature the way the AnyPress docs describe (${DOCS}/email-the-client-when-their-site-is-ready/), reject anything unsigned, and when a site is ready, [what should happen]. Add a test with a signed sample message.`
  },
  SITE_PROMPTS(ask)[4]
];

export const AI_APPS: AiApp[] = [
  {
    id: "claude",
    name: "Claude",
    logo: "/integrations/claude.svg",
    connect: "In Claude, open Settings, then Connectors, then Add custom connector, and paste the connector address. Turn AnyPress on from the + menu in a chat.",
    prompts: SITE_PROMPTS("Using the AnyPress connector,")
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    logo: "/integrations/openai.svg",
    connect: "In ChatGPT, turn on developer mode under Settings, Apps and Connectors, then create a connector with the address. Pick AnyPress from the + menu before you ask.",
    prompts: SITE_PROMPTS("Use the AnyPress app to")
  },
  {
    id: "cursor",
    name: "Cursor",
    logo: "/integrations/cursor.svg",
    connect: "In Cursor's settings, add a new MCP server named anypress with the address as its url, and sign in when it asks. Ask in Agent mode.",
    prompts: CODE_PROMPTS("Using the anypress MCP server,")
  },
  {
    id: "copilot",
    name: "GitHub Copilot",
    logo: "/integrations/githubcopilot.svg",
    connect: "In VS Code, run MCP: Add Server, choose HTTP, paste the address and name it anypress. Ask in Copilot Chat's agent mode.",
    prompts: CODE_PROMPTS("Using the anypress MCP tools,")
  },
  {
    id: "gemini",
    name: "Gemini CLI",
    logo: "/integrations/gemini.svg",
    connect: "Add AnyPress to Gemini CLI's settings.json under mcpServers, with the address as its httpUrl, then run /mcp auth anypress to sign in.",
    prompts: CODE_PROMPTS("Using the anypress MCP server,")
  },
  {
    id: "other",
    name: "Any other app",
    connect: "Devin Desktop or any other app that supports MCP: add a remote MCP server, paste the address and sign in to AnyPress when it asks.",
    prompts: SITE_PROMPTS("Using the AnyPress connector,")
  }
];
