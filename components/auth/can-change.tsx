"use client";

import * as React from "react";

const CanChange = React.createContext(true);

/** Whether the signed-in person may make changes; false for a "Can view" member. Set once in the dashboard's layout. */
export function CanChangeProvider({ value, children }: { value: boolean; children: React.ReactNode }) {
  return <CanChange.Provider value={value}>{children}</CanChange.Provider>;
}

/** False for a "Can view" member: leave out buttons the API would refuse them. */
export function useCanChange(): boolean {
  return React.useContext(CanChange);
}
