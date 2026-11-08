// Writes lib/demo-photos.json: each demo's photo files (the keys of its photos.json) at the theme release in
// lib/demos.ts, so the demo page can download them one by one. Run it after moving THEME_TAG or adding a demo:
//
//   node scripts/demo-photos.mjs

import { readFileSync, writeFileSync } from "node:fs";

const source = readFileSync(new URL("../lib/demos.ts", import.meta.url), "utf8");
const tag = source.match(/THEME_TAG = "([^"]+)"/)[1];
const ids = [...source.matchAll(/^\s+id: "([^"]+)",$/gm)].map((m) => m[1]);
const photos = {};
for (const id of ids) {
  const url = `https://cdn.jsdelivr.net/gh/hamchowderr/anypress-theme@${tag}/demo/${id}/photos.json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  photos[id] = Object.keys((await response.json()).files).sort();
}
writeFileSync(new URL("../lib/demo-photos.json", import.meta.url), JSON.stringify({ tag, photos }, null, 2) + "\n");
console.log(`lib/demo-photos.json: ${ids.length} demos at ${tag}`);
