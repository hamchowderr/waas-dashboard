import { describe, expect, it } from "vitest";

import { chosenScopes, initialScopes, toggleScope, type ScopeArea } from "./connect-scopes";

const area = (name: string, writeTicked: boolean): ScopeArea => ({
  area: name,
  name,
  read: { scope: `${name}:read`, label: "See", ticked: true },
  write: { scope: `${name}:write`, label: "Change", ticked: writeTicked }
});
const areas = [area("stores", true), area("backups", false)];

describe("connect page scope boxes", () => {
  it("starts with every read box, and the write boxes the app asked for", () => {
    expect([...initialScopes(areas, true)]).toEqual(["stores:read", "stores:write", "backups:read"]);
  });

  it("starts with no write box for someone who may only look, and never sends one", () => {
    const ticked = initialScopes(areas, false);
    expect([...ticked]).toEqual(["stores:read", "backups:read"]);
    expect(chosenScopes(areas, toggleScope(areas, ticked, "backups:write", true), false)).toEqual(["stores:read", "backups:read"]);
  });

  it("ticks see with change, and unticks change with see", () => {
    let ticked = new Set<string>();
    ticked = toggleScope(areas, ticked, "backups:write", true);
    expect(chosenScopes(areas, ticked, true)).toEqual(["backups:read", "backups:write"]);
    ticked = toggleScope(areas, ticked, "backups:read", false);
    expect(chosenScopes(areas, ticked, true)).toEqual([]);
  });

  it("has no write boxes on a read-only connection", () => {
    const readOnly = areas.map((a) => ({ ...a, write: null }));
    expect(chosenScopes(readOnly, initialScopes(readOnly, true), true)).toEqual(["stores:read", "backups:read"]);
  });
});
