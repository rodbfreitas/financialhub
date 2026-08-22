"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isNavGroup, type NavGroup } from "@/components/shell/nav-data";

function isActiveHref(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function groupContainsActive(pathname: string, group: NavGroup) {
  return group.children.some((child) => isActiveHref(pathname, child.href));
}

/**
 * Sidebar principal (desktop) — Design System §3-4: logo, itens de navegação (alguns
 * agrupados/expansíveis) e, no rodapé, avatar + nome + household ativo.
 */
export function AppSidebar({
  userName,
  userEmail,
  householdName,
}: {
  userName: string;
  userEmail: string;
  householdName: string;
}) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const item of NAV_ITEMS) {
      if (isNavGroup(item) && groupContainsActive(pathname, item)) {
        initial[item.label] = true;
      }
    }
    return initial;
  });

  function toggleGroup(label: string) {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
        <Link href="/dashboard" className="text-sm font-semibold tracking-tight text-sidebar-foreground">
          Financial Hub
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            if (isNavGroup(item)) {
              const isOpen = !!openGroups[item.label];
              const active = groupContainsActive(pathname, item);
              return (
                <li key={item.label}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(item.label)}
                    aria-expanded={isOpen}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "text-sidebar-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronDown
                      className={cn("size-3.5 shrink-0 transition-transform", isOpen && "rotate-180")}
                    />
                  </button>
                  {isOpen ? (
                    <ul className="mt-0.5 flex flex-col gap-0.5 border-l border-sidebar-border pl-4">
                      {item.children.map((child) => {
                        const active = isActiveHref(pathname, child.href);
                        return (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              aria-current={active ? "page" : undefined}
                              className={cn(
                                "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                                active
                                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                              )}
                            >
                              {child.icon ? <child.icon className="size-3.5 shrink-0" /> : null}
                              {child.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </li>
              );
            }

            const active = isActiveHref(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  {item.icon ? <item.icon className="size-4 shrink-0" /> : null}
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <Link
          href="/configuracoes/conta"
          className="flex items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-sidebar-accent"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
            {userName.slice(0, 1).toUpperCase()}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium text-sidebar-foreground">{userName}</span>
            <span className="truncate text-xs text-muted-foreground">{householdName || userEmail}</span>
          </span>
        </Link>
      </div>
    </aside>
  );
}
