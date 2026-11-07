/**
 * Animated icons from lucide-animated (https://lucide-animated.com, MIT, see LICENSE here): the same drawings as the
 * Lucide icons the rest of the dashboard uses, moving a little on hover. Used only in the sidebar and the account
 * menu; pages keep plain lucide-react icons. Copied in as files (that is how the library is installed); add one by
 * copying its icons/<name>.tsx from the library's repository.
 */
import type * as React from "react";

export { ActivityIcon } from "./activity";
export { BellIcon } from "./bell";
export { BlocksIcon } from "./blocks";
export { BookTextIcon } from "./book-text";
export { CartIcon } from "./cart";
export { ChevronsUpDownIcon } from "./chevrons-up-down";
export { CircleHelpIcon } from "./circle-help";
export { CloudBackupIcon } from "./cloud-backup";
export { CompassIcon } from "./compass";
export { GaugeIcon } from "./gauge";
export { HeartHandshakeIcon } from "./heart-handshake";
export { HistoryIcon } from "./history";
export { HomeIcon } from "./home";
export { KeyIcon } from "./key";
export { LayersIcon } from "./layers";
export { LogoutIcon } from "./logout";
export { MailboxIcon } from "./mailbox";
export { MoonIcon } from "./moon";
export { PaletteIcon } from "./palette";
export { PlugZapIcon } from "./plug-zap";
export { SearchIcon } from "./search";
export { SlidersHorizontalIcon } from "./sliders-horizontal";
export { UsersIcon } from "./users";
export { WebhookIcon } from "./webhook";

/** What every icon here exposes, so a whole row (not only the icon) can start it on hover. */
export type AnimatedIconHandle = { startAnimation: () => void; stopAnimation: () => void };

/** Any icon here: a forwardRef component taking a size in pixels. */
export type AnimatedIcon = React.ForwardRefExoticComponent<
  React.HTMLAttributes<HTMLDivElement> & { size?: number } & React.RefAttributes<AnimatedIconHandle>
>;
