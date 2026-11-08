import { describe, expect, it } from "vitest";

import demoPhotos from "./demo-photos.json";
import { DEMOS, THEME_TAG, demoBlueprint, demoFiles, findDemo, playgroundUrl } from "./demos";

describe("demo websites", () => {
  it("lists each demo once, with its own photo from the pinned theme release", () => {
    expect(new Set(DEMOS.map((d) => d.id)).size).toBe(DEMOS.length);
    for (const demo of DEMOS) expect(demo.photo).toContain(`anypress-theme@${THEME_TAG}/demo/${demo.id}/photos/`);
  });

  it("builds each demo from its own build script, with captions instead of repository addresses", () => {
    for (const demo of DEMOS) {
      const steps = demoBlueprint(demo).steps;
      expect(steps.at(-1)).toMatchObject({ step: "runPHP", progress: { caption: `Building ${demo.business}` } });
      expect((steps.at(-1) as { code: string }).code).toContain(`demo/${demo.id}/build.php`);
      for (const step of steps) expect(step.progress?.caption).toBeTruthy();
    }
  });

  it("downloads the theme zip through the API and only the opened demo's own files, with no git step", () => {
    for (const demo of DEMOS) {
      const steps = demoBlueprint(demo).steps;
      const blueprint = JSON.stringify(steps);
      expect(steps[0]).toMatchObject({ step: "installTheme", themeData: { resource: "url", url: `https://api.anypress.io/branding/demo-files/anypress-theme-${THEME_TAG}.zip` } });
      expect(blueprint).not.toContain("git:directory");
      for (const file of demoFiles(demo)) expect(blueprint).toContain(`anypress-theme@${THEME_TAG}/${file}`);
      expect(demoFiles(demo).filter((f) => f.startsWith(`demo/${demo.id}/photos/`)).length).toBeGreaterThan(5);
    }
    expect(demoFiles(findDemo("ridge/spotless-nest")!)).toContain("demo/ridge/spotless-nest/swap.json");
    expect(demoFiles(findDemo("ridge")!)).not.toContain("demo/ridge/swap.json");
  });

  it("has the photo list for the pinned theme release (run node scripts/demo-photos.mjs after moving it)", () => {
    expect(demoPhotos.tag).toBe(THEME_TAG);
    expect(Object.keys(demoPhotos.photos).sort()).toEqual(DEMOS.map((d) => d.id).sort());
  });

  it("opens Playground's own site in seamless mode with the Blueprint in the address", () => {
    const demo = findDemo("ridge/ironclad-roofing")!;
    const url = new URL(playgroundUrl(demo));
    expect(url.origin + url.pathname + url.search).toBe("https://demo.anypress.site/?mode=seamless");
    expect(JSON.parse(decodeURIComponent(url.hash.slice(1)))).toEqual(demoBlueprint(demo));
    expect(findDemo("nope")).toBeUndefined();
  });
});
