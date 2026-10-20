// The boxes on the connect page (app/connect/[id]): what an AI app may see and change, area by area.
// The API sends one entry per area with its read and write scope and whether each box starts ticked;
// it checks everything again when the person approves.

export type ScopeBox = { scope: string; label: string; ticked: boolean };
export type ScopeArea = { area: string; name: string; read: ScopeBox; write: ScopeBox | null };

/** The scopes ticked to start with. Someone who may only look starts with no write box ticked. */
export function initialScopes(areas: ScopeArea[], canChange: boolean): Set<string> {
  const ticked = new Set<string>();
  for (const a of areas) {
    if (a.read.ticked) ticked.add(a.read.scope);
    if (canChange && a.write?.ticked) ticked.add(a.write.scope);
  }
  return ticked;
}

/** Ticks or unticks one box. Changing an area means seeing it too: ticking change ticks see, unticking see unticks change. */
export function toggleScope(areas: ScopeArea[], ticked: Set<string>, scope: string, on: boolean): Set<string> {
  const next = new Set(ticked);
  const area = areas.find((a) => a.read.scope === scope || a.write?.scope === scope);
  if (!area) return next;
  if (on) {
    next.add(scope);
    if (scope === area.write?.scope) next.add(area.read.scope);
  } else {
    next.delete(scope);
    if (scope === area.read.scope && area.write) next.delete(area.write.scope);
  }
  return next;
}

/** What to send: the ticked scopes in the API's order, without write scopes for someone who may only look. */
export function chosenScopes(areas: ScopeArea[], ticked: Set<string>, canChange: boolean): string[] {
  return areas.flatMap((a) => [a.read, ...(a.write && canChange ? [a.write] : [])]).filter((box) => ticked.has(box.scope)).map((box) => box.scope);
}
