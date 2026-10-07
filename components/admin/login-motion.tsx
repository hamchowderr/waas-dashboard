"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { LottieRefCurrentProps } from "lottie-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

// Same pattern as the Otaku Solutions site's LottiePlay: the player loads on demand,
// client-only, and the JSON comes from /public. Built by scripts/motion/login-motion.mjs.
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

const SRC = { light: "/motion/login-light.json", dark: "/motion/login-dark.json" } as const;
/** The frame the .webp stills show; the animation starts there so the swap is invisible. */
const STILL_FRAME = 200;

/**
 * The sign-in page's motion: a storefront assembling and going live, looping.
 *
 * The still frame renders on the server, in a box with a fixed aspect ratio, so the
 * page never shifts and works without JavaScript. The animation replaces it only
 * after the page is idle, only while `media` matches (the page shows one copy on
 * large screens and another on small ones, so only the visible one animates), and
 * never under prefers-reduced-motion. It never touches the sign-in form.
 */
export function LoginMotion({
  media,
  sizes,
  className
}: {
  /** Media query for when this copy is on screen. */
  media: string;
  /** The still's `sizes`: its width while shown, 1px otherwise, so a hidden copy costs a tiny image. */
  sizes: string;
  className?: string;
}) {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? "dark" : "light";
  const [allowed, setAllowed] = useState(false);
  const [data, setData] = useState<{ theme: string; json: object } | null>(null);
  const [playing, setPlaying] = useState(false);
  const player = useRef<LottieRefCurrentProps>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const shown = window.matchMedia(media);
    const update = () => setAllowed(!reduced.matches && shown.matches);
    // Wait for idle so the animation never competes with the page's first paint.
    const idle = window.requestIdleCallback?.(update, { timeout: 1500 }) ?? window.setTimeout(update, 300);
    reduced.addEventListener("change", update);
    shown.addEventListener("change", update);
    return () => {
      window.cancelIdleCallback?.(idle);
      window.clearTimeout(idle);
      reduced.removeEventListener("change", update);
      shown.removeEventListener("change", update);
    };
  }, [media]);

  useEffect(() => {
    if (!allowed || data?.theme === theme) return;
    let alive = true;
    fetch(SRC[theme])
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((json: object) => {
        if (!alive) return;
        setPlaying(false);
        setData({ theme, json });
      })
      .catch(() => {
        // The still stays; nothing else depends on the animation.
      });
    return () => {
      alive = false;
    };
  }, [allowed, theme, data?.theme]);

  const animate = allowed && data?.theme === theme;

  return (
    <div className={cn("relative aspect-[4/3] w-full", className)} aria-hidden="true">
      <Image
        src="/motion/login-light.webp"
        alt=""
        fill
        priority
        sizes={sizes}
        className={cn("object-contain transition-opacity duration-300 dark:hidden", animate && playing && "opacity-0")}
      />
      <Image
        src="/motion/login-dark.webp"
        alt=""
        fill
        priority
        sizes={sizes}
        className={cn("hidden object-contain transition-opacity duration-300 dark:block", animate && playing && "opacity-0")}
      />
      {animate && (
        <Lottie
          key={data.theme}
          lottieRef={player}
          animationData={data.json}
          loop
          autoplay={false}
          renderer="svg"
          rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
          onDOMLoaded={() => {
            player.current?.goToAndPlay(STILL_FRAME, true);
            setPlaying(true);
          }}
          className="absolute inset-0 size-full"
        />
      )}
    </div>
  );
}
