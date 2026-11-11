"use client";

import * as React from "react";
import {
  BriefcaseIcon,
  CheckIcon,
  ChurchIcon,
  CodeXmlIcon,
  CopyIcon,
  GraduationCapIcon,
  LandmarkIcon,
  MapPinIcon,
  ShieldCheckIcon,
  TagIcon,
  type LucideIcon
} from "lucide-react";
import { toast } from "sonner";

import type { GroupId } from "@/lib/sales-kit";
import { Button } from "@/components/ui/button";

const GROUP_ICONS: Record<GroupId, LucideIcon> = {
  shops: TagIcon,
  regulated: ShieldCheckIcon,
  courses: GraduationCapIcon,
  chambers: LandmarkIcon,
  churches: ChurchIcon,
  franchises: MapPinIcon,
  agencies: BriefcaseIcon,
  developers: CodeXmlIcon
};

/** The group's icon in a neutral round chip, as on card headers and the store type icons. */
export function GroupIcon({ id, className = "size-10" }: { id: GroupId; className?: string }) {
  const Icon = GROUP_ICONS[id];
  return (
    <span className={`bg-muted text-foreground/70 flex shrink-0 items-center justify-center rounded-full ${className}`}>
      <Icon className="size-1/2" aria-hidden />
    </span>
  );
}

export function CopyButton({ text, label, variant = "outline" }: { text: string; label: string; variant?: "outline" | "ghost" }) {
  const [done, setDone] = React.useState(false);
  return (
    <Button
      variant={variant}
      size="sm"
      aria-label={`Copy ${label}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          toast.error("Couldn't copy. Select the text and copy it instead.");
        }
      }}
    >
      {done ? <CheckIcon data-icon="inline-start" /> : <CopyIcon data-icon="inline-start" />}
      <span className="max-sm:sr-only">{done ? "Copied" : "Copy"}</span>
    </Button>
  );
}

export function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
