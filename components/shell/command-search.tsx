"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "lucide-react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { linkHref, navFor } from "@/components/shell/nav";

/** The sidebar's search box: opens a page finder, also on ⌘K / Ctrl+K. product: the storefront picked in the header. */
export function CommandSearch({
  isAdmin,
  isReseller,
  product
}: {
  isAdmin: boolean;
  isReseller: boolean;
  product: string | null;
}) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((was) => !was);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <SidebarGroup className="py-0 group-data-[collapsible=icon]:hidden">
        <SidebarGroupContent className="relative">
          <SidebarInput
            aria-label="Search"
            placeholder="Search..."
            className="cursor-pointer pl-8"
            readOnly
            onClick={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              setOpen(true);
            }}
          />
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 opacity-50" />
          <Kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2">
            ⌘K
          </Kbd>
        </SidebarGroupContent>
      </SidebarGroup>
      <SidebarMenu className="hidden group-data-[collapsible=icon]:flex">
        <SidebarMenuItem>
          <SidebarMenuButton tooltip="Search" onClick={() => setOpen(true)}>
            <SearchIcon />
            <span>Search</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      <CommandDialog open={open} onOpenChange={setOpen} title="Search" description="Go to a page">
        <Command>
          <CommandInput placeholder="Go to a page..." />
          <CommandList>
            <CommandEmpty>No page matches.</CommandEmpty>
            {navFor(isAdmin, isReseller).map((group, index) => (
              <React.Fragment key={group.title}>
                {index > 0 && <CommandSeparator />}
                <CommandGroup heading={group.title}>
                  {group.links.map((link) => (
                    <CommandItem key={link.href} onSelect={() => go(linkHref(link, product))}>
                      <link.icon />
                      {link.title}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </React.Fragment>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
