import * as React from "react"
import { cn } from "cn"

function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-[1.375rem] bg-card py-(--card-spacing) text-sm text-card-foreground shadow-card dark:ring-1 dark:ring-white/6 [--card-spacing:--spacing(5.5)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(4)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-[1.375rem] *:[img:last-child]:rounded-b-[1.375rem]",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] has-data-[slot=card-icon]:grid-cols-[auto_1fr] has-data-[slot=card-icon]:gap-x-3.5 has-data-[slot=card-icon]:has-data-[slot=card-action]:grid-cols-[auto_1fr_auto] [.border-b]:pb-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading row-start-1 text-[1.05rem] leading-snug font-bold tracking-[-0.015em] group-data-[size=sm]/card:text-sm group-has-data-[slot=card-icon]/card-header:col-start-2",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("row-start-2 text-sm text-muted-foreground group-has-data-[slot=card-icon]/card-header:col-start-2", className)}
      {...props}
    />
  )
}

/** inline: a small text link that stays beside the title even on a narrow card. */
function CardAction({ className, inline = false, ...props }: React.ComponentProps<"div"> & { inline?: boolean }) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-[-2] row-span-2 row-start-1 self-start justify-self-end",
        // On a narrow card a button moves to its own row under the text instead of squeezing it.
        !inline &&
          "@max-md/card-header:col-span-full @max-md/card-header:col-start-1 @max-md/card-header:row-span-1 @max-md/card-header:row-start-3 @max-md/card-header:mt-2 @max-md/card-header:justify-self-start",
        className
      )}
      {...props}
    />
  )
}

/** Soft tinted chips for card icons: the colour says what kind of section it is (DESIGN.md, Tinted chips). */
const ICON_TONES = {
  ribbon: "bg-primary/10 text-primary",
  violet: "bg-fuchsia-600/10 text-fuchsia-700 dark:bg-fuchsia-400/15 dark:text-fuchsia-300",
  sky: "bg-sky-600/10 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300",
  teal: "bg-teal-600/10 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300",
  orange: "bg-orange-500/12 text-orange-700 dark:bg-orange-400/15 dark:text-orange-300",
  stone: "bg-stone-500/12 text-stone-700 dark:bg-stone-400/15 dark:text-stone-300"
} as const

/** A round icon chip at the start of a card's header; the title and description sit beside it. */
function CardIcon({
  className,
  tone = "ribbon",
  ...props
}: React.ComponentProps<"span"> & { tone?: keyof typeof ICON_TONES }) {
  return (
    <span
      data-slot="card-icon"
      aria-hidden
      className={cn(
        "col-start-1 row-span-2 row-start-1 flex size-10 shrink-0 items-center justify-center rounded-full [&_svg]:size-[1.125rem]",
        ICON_TONES[tone],
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-[1.375rem] border-t bg-muted/60 p-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  CardIcon,
}
