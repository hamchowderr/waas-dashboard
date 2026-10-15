// Builds the sign-in page's motion: a storefront page assembling inside a browser
// window, then going live (green dot and check), as a seamless 5 s loop.
//
//   node scripts/motion/login-motion.mjs
//
// Writes public/motion/login-light.json and login-dark.json: the same animation in
// the dashboard's light and dark theme colours (app/globals.css tokens). Authored with
// the text-to-lottie skill's conventions (github.com/diffusionstudio/lottie) and
// checked in its Skottie player and in lottie-web. The .webp stills next to them are
// frame 200 of each file, rendered from the JSON.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../../public/motion");

const FPS = 60;
const FRAMES = 300; // 5 s
const W = 480;
const H = 360;

/** sRGB [0..1] of an achromatic oklch(L 0 0) token. */
function gray(l) {
  const y = l ** 3;
  const s = y <= 0.0031308 ? 12.92 * y : 1.055 * y ** (1 / 2.4) - 0.055;
  return [s, s, s];
}
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

// Tokens: card, border, muted, chart-*, primary; green as in the status badges.
const PALETTES = {
  light: {
    window: gray(1), // --card
    frame: gray(0.922), // --border
    dot: gray(0.87), // --chart-1
    block: gray(0.922), // --border
    blockStrong: gray(0.87), // --chart-1
    primary: gray(0.205), // --primary
    live: hex("#16a34a"), // green-600
    onLive: gray(1)
  },
  dark: {
    window: gray(0.205), // --card
    frame: gray(0.32), // --border (white 10% over the card)
    dot: gray(0.439), // --chart-3
    block: gray(0.32),
    blockStrong: gray(0.371), // --chart-4
    primary: gray(0.922), // --primary
    live: hex("#4ade80"), // green-400
    onLive: gray(0.145)
  }
};

// Easing anchors from the skill's motion-taste reference (cubic-bezier x1,y1,x2,y2).
const EASE = {
  entrance: [0.2, 0.75, 0.34, 0.94], // entrance-sharp
  settle: [0, 0.65, 0.51, 0.99], // settle-soft
  pop: [0.94, 0.75, 0.34, 0.94], // expressive-pop (focal: the live badge)
  exit: [1, 0.02, 0.54, 0.42], // exit-accelerate
  linear: [0, 0, 1, 1]
};

const still = (k) => ({ a: 0, k });

/** Keyframed property: [[frame, value, easeIntoNext?], ...]. */
function anim(keys) {
  return {
    a: 1,
    k: keys.map(([t, v, ease = "settle"], i) => {
      const s = Array.isArray(v) ? v : [v];
      if (i === keys.length - 1) return { t, s };
      const [x1, y1, x2, y2] = EASE[ease];
      const dims = s.length;
      return {
        t,
        s,
        o: { x: Array(dims).fill(x1), y: Array(dims).fill(y1) },
        i: { x: Array(dims).fill(x2), y: Array(dims).fill(y2) }
      };
    })
  };
}

const rgba = (c, a = 1) => [...c, a];
const rect = (w, h, r) => ({ ty: "rc", d: 1, s: still([w, h]), p: still([0, 0]), r: still(r) });
const ellipse = (d) => ({ ty: "el", d: 1, s: still([d, d]), p: still([0, 0]) });
const fill = (c) => ({ ty: "fl", c: still(rgba(c)), o: still(100), r: 1, bm: 0 });
const stroke = (c, w, o = 100) => ({ ty: "st", c: still(rgba(c)), o: still(o), w: still(w), lc: 2, lj: 2, ml: 4, bm: 0 });
const groupTransform = () => ({
  ty: "tr",
  p: still([0, 0]),
  a: still([0, 0]),
  s: still([100, 100]),
  r: still(0),
  o: still(100)
});
const group = (nm, items) => ({ ty: "gr", nm, it: [...items, groupTransform()] });

let index = 0;
/** A shape layer drawn around its own origin and placed at `p`. */
function layer(nm, shapes, { p, o = still(100), s = still([100, 100]) }) {
  index += 1;
  return {
    ddd: 0,
    ind: index,
    ty: 4,
    nm,
    sr: 1,
    ks: { o, r: still(0), p: p.a === undefined ? still([...p, 0]) : p, a: still([0, 0, 0]), s },
    ao: 0,
    shapes,
    ip: 0,
    op: FRAMES,
    st: 0,
    bm: 0
  };
}

// Layout: the window spans x 40..440, y 34..326; content sits below a 32 px title bar.
const WIN = { x: 240, y: 180, w: 400, h: 292 };
const TOP = WIN.y - WIN.h / 2; // 34
const LEFT = WIN.x - WIN.w / 2; // 40

// Content timeline: blocks settle in one after another, the page goes live at 104,
// everything holds, then the content clears (250..286) back to the empty window of
// frame 0, so the loop seam is invisible.
const OUT_START = 250;
const OUT_END = 286;

/** Opacity: in over [start, start+dur], hold, out with the rest of the page. */
const inHoldOut = (start, dur = 22) =>
  anim([
    [0, 0, "linear"],
    [start, 0, "entrance"],
    [start + dur, 100, "linear"],
    [OUT_START, 100, "exit"],
    [OUT_END, 0, "linear"],
    [FRAMES, 0]
  ]);

/** Position: from `from` to `to` on the way in; lifts slightly on the way out. */
const slide = (from, to, start, dur = 24) =>
  anim([
    [0, [...from, 0], "linear"],
    [start, [...from, 0], "settle"],
    [start + dur, [...to, 0], "linear"],
    [OUT_START, [...to, 0], "exit"],
    [OUT_END, [to[0], to[1] - 6, 0], "linear"],
    [FRAMES, [...from, 0]]
  ]);

const pop = (start, dur = 22) =>
  anim([
    [0, [86, 86, 100], "linear"],
    [start, [86, 86, 100], "settle"],
    [start + dur, [100, 100, 100], "linear"],
    [OUT_START, [100, 100, 100], "exit"],
    [OUT_END, [96, 96, 100], "linear"],
    [FRAMES, [86, 86, 100]]
  ]);

function build(c) {
  index = 0;
  const contentTop = TOP + 32;
  const layers = [];

  // Live badge (focal): a check in a green circle over the window's bottom-right corner.
  const badge = { x: WIN.x + WIN.w / 2 - 6, y: WIN.y + WIN.h / 2 - 6 };
  const badgeIn = 112;
  layers.push(
    layer(
      "Live badge",
      [
        group("Check", [
          {
            ty: "sh",
            ks: still({ i: [[0, 0], [0, 0], [0, 0]], o: [[0, 0], [0, 0], [0, 0]], v: [[-8, 0], [-2.5, 6], [9, -6]], c: false })
          },
          {
            ty: "tm",
            s: still(0),
            e: anim([
              [0, 0, "linear"],
              [badgeIn + 10, 0, "entrance"],
              [badgeIn + 30, 100, "linear"],
              // Stays whole while the badge fades, then resets unseen.
              [OUT_END - 6, 100, "linear"],
              [OUT_END - 5, 0, "linear"],
              [FRAMES, 0]
            ]),
            o: still(0),
            m: 1
          },
          stroke(c.onLive, 3.5)
        ]),
        group("Disc", [ellipse(36), fill(c.live)])
      ],
      {
        p: [badge.x, badge.y],
        o: anim([
          [0, 0, "linear"],
          [badgeIn, 0, "entrance"],
          [badgeIn + 8, 100, "linear"],
          [OUT_START, 100, "exit"],
          [OUT_END - 6, 0, "linear"],
          [FRAMES, 0]
        ]),
        s: anim([
          [0, [0, 0, 100], "linear"],
          [badgeIn, [0, 0, 100], "pop"],
          [badgeIn + 16, [112, 112, 100], "settle"],
          [badgeIn + 28, [100, 100, 100], "linear"],
          [OUT_START, [100, 100, 100], "exit"],
          [OUT_END - 6, [60, 60, 100], "linear"],
          [FRAMES, [0, 0, 100]]
        ])
      }
    )
  );

  // Live dot in the title bar, with a ping ring twice while the page is live.
  const dot = { x: LEFT + WIN.w - 22, y: TOP + 16 };
  const ping = (start) => [
    [start, [40, 40, 100], "settle"],
    [start + 46, [260, 260, 100], "linear"]
  ];
  layers.push(
    layer("Live ping", [group("Ring", [ellipse(10), stroke(c.live, 1.5)])], {
      p: [dot.x, dot.y],
      s: anim([[0, [40, 40, 100], "linear"], ...ping(104), [160, [40, 40, 100], "linear"], ...ping(170), [FRAMES, [40, 40, 100]]]),
      o: anim([
        [0, 0, "linear"],
        [104, 0, "linear"],
        [106, 90, "settle"],
        [150, 0, "linear"],
        [170, 0, "linear"],
        [172, 90, "settle"],
        [216, 0, "linear"],
        [FRAMES, 0]
      ])
    }),
    layer("Live dot", [group("Dot", [ellipse(10), fill(c.live)])], {
      p: [dot.x, dot.y],
      o: inHoldOut(100, 8),
      s: anim([
        [0, [0, 0, 100], "linear"],
        [100, [0, 0, 100], "pop"],
        [114, [100, 100, 100], "linear"],
        [OUT_START, [100, 100, 100], "exit"],
        [OUT_END, [0, 0, 100], "linear"],
        [FRAMES, [0, 0, 100]]
      ])
    })
  );

  // Page blocks, in reading order: header bar and cart button, hero lines, product grid.
  const headerY = contentTop + 22;
  layers.push(
    layer("Cart button", [group("Pill", [rect(68, 20, 10), fill(c.primary)])], {
      p: slide([LEFT + WIN.w - 62 + 24, headerY], [LEFT + WIN.w - 62, headerY], 64),
      o: inHoldOut(64)
    }),
    layer("Header", [group("Bar", [rect(150, 12, 6), fill(c.blockStrong)])], {
      p: slide([LEFT + 24 + 75, headerY - 10], [LEFT + 24 + 75, headerY], 12),
      o: inHoldOut(12)
    })
  );

  const heroY = contentTop + 70;
  layers.push(
    layer("Hero title", [group("Line", [rect(220, 16, 8), fill(c.blockStrong)])], {
      p: slide([LEFT + 24 + 110, heroY + 10], [LEFT + 24 + 110, heroY], 26),
      o: inHoldOut(26)
    }),
    layer("Hero line", [group("Line", [rect(160, 10, 5), fill(c.block)])], {
      p: slide([LEFT + 24 + 80, heroY + 34], [LEFT + 24 + 80, heroY + 24], 32),
      o: inHoldOut(32)
    })
  );

  // Product grid: three tiles, staggered left to right.
  const tileW = 108;
  const tileH = 96;
  const gap = 14;
  const gridY = contentTop + 160;
  for (let i = 0; i < 3; i++) {
    const x = LEFT + 24 + tileW / 2 + i * (tileW + gap);
    const start = 44 + i * 6;
    layers.push(
      layer(
        `Product tile ${i + 1}`,
        [
          group("Caption", [{ ...rect(60, 8, 4), p: still([-18, 30]) }, fill(c.block)]),
          group("Image", [{ ...rect(tileW - 16, 52, 8), p: still([0, -10]) }, fill(c.block)]),
          group("Tile", [rect(tileW, tileH, 10), stroke(c.frame, 1.5)])
        ],
        { p: [x, gridY], o: inHoldOut(start), s: pop(start) }
      )
    );
  }

  // The window itself never moves: title-bar dots, divider, frame.
  const dots = [0, 1, 2].map((i) =>
    group(`Dot ${i + 1}`, [{ ...ellipse(9), p: still([LEFT + 18 + i * 14 - WIN.x, TOP + 16 - WIN.y]) }, fill(c.dot)])
  );
  layers.push(
    layer(
      "Window",
      [
        ...dots,
        group("Title divider", [
          {
            ty: "sh",
            ks: still({
              i: [[0, 0], [0, 0]],
              o: [[0, 0], [0, 0]],
              v: [[-WIN.w / 2, TOP + 32 - WIN.y], [WIN.w / 2, TOP + 32 - WIN.y]],
              c: false
            })
          },
          stroke(c.frame, 1.5)
        ]),
        group("Frame", [rect(WIN.w, WIN.h, 14), stroke(c.frame, 1.5), fill(c.window)])
      ],
      { p: [WIN.x, WIN.y] }
    )
  );

  return {
    v: "5.12.0",
    fr: FPS,
    ip: 0,
    op: FRAMES,
    w: W,
    h: H,
    nm: "Store goes live",
    ddd: 0,
    assets: [],
    layers,
    markers: []
  };
}

mkdirSync(OUT, { recursive: true });
for (const [name, palette] of Object.entries(PALETTES)) {
  const file = join(OUT, `login-${name}.json`);
  const json = JSON.stringify(build(palette), (_, v) => (typeof v === "number" ? Math.round(v * 1000) / 1000 : v));
  writeFileSync(file, json);
  console.log(`${file}: ${(json.length / 1024).toFixed(1)} KB`);
}
