"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/components/nav-items";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Barra inferior fixa (mobile) + FAB “Registrar”
export default function MobileNav() {
  const pathname = usePathname();

  // tabs sem o "Registrar" (ele vira o FAB central)
  const tabs = NAV_ITEMS.filter((i) => i.href !== "/matches");

  return (
    <>
      {/* Bottom Tab Bar */}
      <nav
        className="
          sm:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/80 backdrop-blur
          supports-[padding:max(0px)]:pb-[env(safe-area-inset-bottom)]
        "
        aria-label="Navegação principal"
      >
        <ul className="grid grid-cols-3">
          {tabs.map((it) => {
            const active = pathname === it.href || (it.href !== "/" && pathname.startsWith(it.href));
            const Icon = it.icon;
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 py-2 text-xs",
                    "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "text-foreground font-medium" : "text-muted-foreground"
                  )}
                >
                  {Icon ? <Icon className="h-5 w-5" /> : null}
                  <span>{it.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* FAB central para Registrar */}
      <div className="sm:hidden fixed bottom-12 inset-x-0 z-50 pointer-events-none">
        <div className="flex justify-center">
          <Button
            asChild
            size="lg"
            className="
              pointer-events-auto rounded-full shadow-lg
              h-12 w-12 p-0
            "
            aria-label="Registrar partida"
          >
            <Link href="/matches" />
          </Button>
        </div>
      </div>

      {/* Spacer para não cobrir conteúdo pelo bottom bar */}
      <div className="sm:hidden h-16" aria-hidden="true" />
    </>
  );
}
