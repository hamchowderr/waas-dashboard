// The demo websites the /demo page opens: the AnyPress theme's demos (demo/<kit>/build.php and
// demo/<kit>/<business>/build.php in hamchowderr/anypress-theme), each built on WordPress Playground in the visitor's
// own browser. Nothing is made on the server, and a visitor's changes vanish when they close the tab.

import demoPhotos from "./demo-photos.json";

const THEME_REPO = "https://github.com/hamchowderr/anypress-theme";
/**
 * The theme release the demos are built from. The theme comes from its small release zip; the demo's own files and
 * photos (in the repository, not the zip) come from the same tag, file by file, so a visitor downloads only the demo
 * they open. Move this forward when the theme releases new or fixed demos, then run `node scripts/demo-photos.mjs`.
 */
export const THEME_TAG = "v0.10.0";
/** The AnyPress Blocks release the demos use (blocks such as the before-and-after slider and the phone bar). */
export const BLOCKS_TAG = "v0.4.0";

const THEME_ZIP = `${THEME_REPO}/releases/download/${THEME_TAG}/anypress.zip`;
const BLOCKS_ZIP = `https://github.com/hamchowderr/anypress-blocks/releases/download/${BLOCKS_TAG}/anypress-blocks.zip`;
/** jsDelivr answers any site, so Playground downloads these files directly, without its proxy or its git add-on. */
const themeFile = (path: string) => `https://cdn.jsdelivr.net/gh/hamchowderr/anypress-theme@${THEME_TAG}/${path}`;
const THEME_DIR = "/wordpress/wp-content/themes/anypress";

export type Demo = {
  /** demo/<id>/build.php in the theme; also the ?d= value that opens it. */
  id: string;
  business: string;
  /** The kind of business, as a customer would say it. */
  kind: string;
  /** Where it is, for a local business. */
  city?: string;
  /** A photo from the demo itself, for its card. */
  photo: string;
  /** What to try on it, in a line. */
  about: string;
};

const photo = (path: string) => themeFile(`demo/${path}`);

export const DEMOS: Demo[] = [
  {
    id: "ridge/ironclad-roofing",
    business: "Ironclad Roofing",
    kind: "Roofer",
    city: "Oklahoma City",
    photo: photo("ridge/ironclad-roofing/photos/roofers-at-work.jpg"),
    about: "Storm-damage inspections, a quote form, service areas and a blog."
  },
  {
    id: "ridge",
    business: "Clearwater Plumbing & Heating",
    kind: "Plumber",
    city: "Springfield",
    photo: photo("ridge/photos/62565.jpg"),
    about: "Emergency call-outs, services, reviews and an online booking form."
  },
  {
    id: "circuit",
    business: "Brightline Electric",
    kind: "Electrician",
    city: "Columbus",
    photo: photo("circuit/photos/249194.jpg"),
    about: "Services, before-and-after work, financing and a quote request."
  },
  {
    id: "ridge/spotless-nest",
    business: "Spotless Nest",
    kind: "House cleaning",
    city: "Raleigh",
    photo: photo("ridge/spotless-nest/photos/living-room.jpg"),
    about: "Cleaning plans, a first-clean offer, booking and reviews."
  },
  {
    id: "ridge/greenline-landscaping",
    business: "Greenline Landscaping",
    kind: "Landscaping",
    city: "Nashville",
    photo: photo("ridge/greenline-landscaping/photos/canna-bed.jpg"),
    about: "Lawn care plans, design projects, a free estimate form and a blog."
  },
  {
    id: "ridge/guardian-pest-control",
    business: "Guardian Pest Control",
    kind: "Pest control",
    city: "Houston",
    photo: photo("ridge/guardian-pest-control/photos/wasp-nest-spraying.jpg"),
    about: "Pest guides, protection plans, a free inspection form and a blog."
  },
  {
    id: "ridge/fixwell-handyman",
    business: "Fixwell Handyman",
    kind: "Handyman",
    city: "Orlando",
    photo: photo("ridge/fixwell-handyman/photos/carpenter-measuring.jpg"),
    about: "Home repairs, project photos, a quote form and reviews."
  },
  {
    id: "circuit/main-street-auto",
    business: "Main Street Auto Care",
    kind: "Auto repair",
    city: "Boise",
    photo: photo("circuit/main-street-auto/photos/mechanic-suspension.jpg"),
    about: "Repair services, an appointment form, offers and reviews."
  },
  {
    id: "commons",
    business: "Springfield Chamber of Commerce",
    kind: "Chamber of commerce",
    city: "Springfield",
    photo: photo("commons/photos/hero.jpg"),
    about: "Membership, events, local news and a join form."
  },
  {
    id: "chapter",
    business: "Draw with Mara",
    kind: "Online courses",
    photo: photo("chapter/photos/sketchbook.jpg"),
    about: "Drawing courses, weekend workshops in six cities and a sign-up form."
  },
  {
    id: "launch",
    business: "Tally",
    kind: "Software app",
    photo: photo("launch/photos/typing.jpg"),
    about: "Features, pricing plans, customer stories and a free trial sign-up."
  }
];

export const findDemo = (id: string | null | undefined): Demo | undefined => DEMOS.find((d) => d.id === id);

/**
 * The files a demo's build reads: the shared builder, the demo's build script and JSON, and its photos (listed in
 * demo-photos.json). A business on a kit (demo/<kit>/<business>) also has swap.json, the kit's words swapped for its own.
 */
export function demoFiles(demo: Demo): string[] {
  const own = ["build.php", "photos.json", "services.json", "towns.json", "posts.json"];
  if (demo.id.includes("/")) own.push("swap.json");
  const photos = (demoPhotos.photos as Record<string, string[]>)[demo.id] ?? [];
  return ["demo/trades.php", ...own.map((file) => `demo/${demo.id}/${file}`), ...photos.map((file) => `demo/${demo.id}/photos/${file}`)];
}

/**
 * The Playground Blueprint that builds a demo: the theme and its blocks from their release zips, Fluent Forms, the
 * demo's own files and photos, then its build script. No git step: Playground loads that from a separate file, which
 * a browser holding an older copy of Playground can fail to fetch.
 */
export function demoBlueprint(demo: Demo) {
  return {
    $schema: "https://playground.wordpress.net/blueprint-schema.json",
    meta: { title: demo.business, author: "AnyPress", description: `A ${demo.kind.toLowerCase()} website built with the AnyPress theme.` },
    landingPage: "/",
    preferredVersions: { php: "8.3", wp: "latest" },
    // Signed in as the site's owner, so the visitor can open the editor and change anything.
    login: true,
    steps: [
      {
        step: "installTheme",
        themeData: { resource: "url", url: THEME_ZIP },
        options: { activate: true, targetFolderName: "anypress" },
        // Playground's loading screen shows these, in place of the addresses it downloads from.
        progress: { caption: "Setting up the design" }
      },
      {
        step: "installPlugin",
        pluginData: { resource: "url", url: BLOCKS_ZIP },
        options: { activate: true, targetFolderName: "anypress-blocks" },
        progress: { caption: "Adding the page sections" }
      },
      {
        step: "installPlugin",
        pluginData: { resource: "wordpress.org/plugins", slug: "fluentform" },
        options: { activate: true },
        progress: { caption: "Adding the forms" }
      },
      {
        step: "mkdir",
        path: `${THEME_DIR}/demo/${demo.id}/photos`,
        progress: { caption: `Writing ${demo.business}'s pages` }
      },
      ...demoFiles(demo).map((path) => ({
        step: "writeFile",
        path: `${THEME_DIR}/${path}`,
        data: { resource: "url", url: themeFile(path) },
        progress: { caption: path.includes("/photos/") ? `Adding ${demo.business}'s photos` : `Writing ${demo.business}'s pages` }
      })),
      {
        step: "runPHP",
        code: `<?php require '/wordpress/wp-load.php'; require get_theme_file_path( 'demo/${demo.id}/build.php' );`,
        progress: { caption: `Building ${demo.business}` }
      }
    ]
  };
}

/**
 * The address that opens the demo: WordPress Playground's own site in its seamless mode (WordPress alone, none of
 * Playground's toolbar), with the Blueprint in the address. Playground's own site, not a client on this page,
 * because only Playground's sites may use its proxy to download from GitHub.
 */
export function playgroundUrl(demo: Demo): string {
  return `https://playground.wordpress.net/?mode=seamless#${encodeURIComponent(JSON.stringify(demoBlueprint(demo)))}`;
}
