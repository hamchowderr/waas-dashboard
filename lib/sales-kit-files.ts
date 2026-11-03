import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { GROUP_IDS, parseGuide, parsePlaybook, type Guide, type Playbook } from "./sales-kit";

/** next.config.ts traces this folder into the Sell page's server bundle. */
const ROOT = path.join(process.cwd(), "content", "sales-kit");

export const GUIDE_IDS = ["pricing", "call-script", "objections", "onboarding"] as const;

export async function loadSalesKit(): Promise<{ playbooks: Playbook[]; guides: Guide[] }> {
  const [playbooks, guides] = await Promise.all([
    Promise.all(GROUP_IDS.map(async (id) => parsePlaybook(await readFile(path.join(ROOT, "groups", `${id}.md`), "utf8")))),
    Promise.all(GUIDE_IDS.map(async (id) => parseGuide(await readFile(path.join(ROOT, "guides", `${id}.md`), "utf8"))))
  ]);
  return { playbooks, guides };
}
