"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { MOBILE_BOTTOM_NAV, NAV_ITEMS, isNavGroup } from "@/components/shell/nav-data";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { LogoutButton } from "@/components/auth/logout-button";

function isActiveHref(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Bottom navigation mobile — Design System §47-48: 3 atalhos fixos + "Mais", que abre
 * o resto do menu (mesma estrutura da sidebar desktop) num Sheet.
 */
export function MobileBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center border-t border-border bg-card md:hidden">
        {MOBILE_BOTTOM_NAV.map((item) => {
          const active = isActiveHref(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-xs",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              {item.icon ? <item.icon className="size-5" /> : null}
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-xs text-muted-foreground"
        >
          <MoreHorizontal className="size-5" />
          Mais
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-1 px-5 pb-2">
            {NAV_ITEMS.flatMap((item) => (isNavGroup(item) ? item.children : [item])).map(
              (leaf) => {
                const active = isActiveHref(pathname, leaf.href);
                return (
                  <SheetClose asChild key={leaf.href}>
                    <Link
                      href={leaf.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-2 py-2.5 text-sm",
                        active ? "font-medium text-primary" : "text-foreground",
                      )}
                    >
                      {leaf.icon ? <leaf.icon className="size-4 shrink-0" /> : null}
                      {leaf.label}
                    </Link>
                  </SheetClose>
                );
              },
            )}
          </div>
          <div className="border-t border-border px-5 py-4">
            <LogoutButton />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
