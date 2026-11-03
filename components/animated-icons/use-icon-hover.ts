"use client";

import * as React from "react";

import type { AnimatedIconHandle } from "./index";

/**
 * Starts an animated icon while its whole row is hovered or focused (not only the icon itself). Spread `row` on the
 * row and pass `ref` to the icon.
 */
export function useIconHover() {
  const ref = React.useRef<AnimatedIconHandle>(null);
  const start = React.useCallback(() => ref.current?.startAnimation(), []);
  const stop = React.useCallback(() => ref.current?.stopAnimation(), []);
  return { ref, row: { onMouseEnter: start, onMouseLeave: stop, onFocus: start, onBlur: stop } };
}
