// The demo websites the /demo page opens: the AnyPress theme's business demos (demo/<kit>/<business>/build.php in
// hamchowderr/anypress-theme), each built on WordPress Playground in the visitor's own browser. Nothing is made on the
// server, and a visitor's changes vanish when they close the tab.

const THEME_REPO = "https://github.com/hamchowderr/anypress-theme";
const BLOCKS_REPO = "https://github.com/hamchowderr/anypress-blocks";
/**
 * The theme commit the demos are built from. Business demos ship in the repository, not in the theme zip stores get,
 * so a demo needs the commit that added it; move this forward when the theme adds or fixes demos.
 */
export const THEME_COMMIT = "00e30691aabd63c4eec6d6cd7e875f53678dfa01";
/** The AnyPress Blocks release the demos use (blocks such as the before-and-after slider and the phone bar). */
export const BLOCKS_TAG = "v0.4.0";

export type Demo = {
  /** demo/<id>/build.php in the theme; also the ?d= value that opens it. */
  id: string;
  business: string;
  /** The kind of business, as a customer would say it. */
  kind: string;
  city: string;
  /** A photo from the demo itself, for its card. */
  photo: string;
  /** What to try on it, in a line. */
  about: string;
};

const photo = (path: string) => `https://cdn.jsdelivr.net/gh/hamchowderr/anypress-theme@${THEME_COMMIT}/demo/${path}`;

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
  }
];

export const findDemo = (id: string | null | undefined): Demo | undefined => DEMOS.find((d) => d.id === id);

/** The Playground Blueprint that builds a demo: the theme and its blocks, Fluent Forms, then the demo's build script. */
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
        themeData: { resource: "git:directory", url: THEME_REPO, ref: THEME_COMMIT, refType: "commit" },
        options: { activate: true, targetFolderName: "anypress" },
        // Playground's loading screen shows these, in place of the repository's address.
        progress: { caption: "Setting up the design" }
      },
      {
        step: "installPlugin",
        pluginData: { resource: "git:directory", url: BLOCKS_REPO, ref: BLOCKS_TAG, refType: "tag" },
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
 * because only Playground's sites may use its proxy to read the theme from GitHub.
 */
export function playgroundUrl(demo: Demo): string {
  return `https://playground.wordpress.net/?mode=seamless#${encodeURIComponent(JSON.stringify(demoBlueprint(demo)))}`;
}
