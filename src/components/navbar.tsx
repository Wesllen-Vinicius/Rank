"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { NAV_ITEMS } from "@/components/nav-items";
import { Trophy, Plus, Search } from "lucide-react";
import { ModeToggle } from "./mode-toggle";

import { Kbd } from "@/components/ui/kbd";
import GlobalSearch from "./global-search";

function openGlobalSearch() {
  // dispara um evento global para o componente GlobalSearch abrir
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("open-global-search"));
  }
}

export default function Navbar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="container mx-auto h-14 px-4 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 font-semibold shrink-0">
          <Trophy className="h-5 w-5" />
          <span className="truncate">Placar de Amigos</span>
        </Link>

        {/* Desktop */}
        <nav className="ml-auto hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((it) => (
            <Button
              key={it.href}
              asChild
              variant="ghost"
              className="data-[active=true]:bg-muted data-[active=true]:font-medium"
              data-active={isActive(it.href)}
            >
              <Link href={it.href} aria-current={isActive(it.href) ? "page" : undefined}>
                {it.label}
              </Link>
            </Button>
          ))}

          <div className="mx-1 w-px self-stretch bg-border" />

          {/* Botão de busca (Ctrl/⌘+K) */}
          <Button
            variant="outline"
            size="sm"
            onClick={openGlobalSearch}
            className="hidden md:inline-flex items-center gap-2"
            aria-label="Abrir busca (Ctrl/⌘+K)"
            title="Abrir busca (Ctrl/⌘+K)"
          >
            <Search className="h-4 w-4" />
            Buscar <span className="ml-1 hidden lg:inline-flex items-center gap-1">
              <Kbd>Ctrl</Kbd> + <Kbd>K</Kbd>
            </span>
          </Button>

          <Button asChild size="sm" className="flex items-center gap-2">
            <Link href="/matches">
              <Plus className="h-4 w-4" />
              <span>Partida</span>
            </Link>
          </Button>

          <ModeToggle />
        </nav>

        {/* Mobile */}
        <div className="ml-auto flex md:hidden items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={openGlobalSearch}
            aria-label="Abrir busca"
            title="Abrir busca"
          >
            <Search className="h-4 w-4" />
          </Button>

          <Button asChild size="sm" className="flex items-center gap-2">
            <Link href="/matches">
              <Plus className="h-4 w-4" />
              <span className="sr-only">Nova partida</span>
            </Link>
          </Button>

          <ModeToggle />
        </div>
      </div>

      {/* Monta o diálogo de busca em nível de layout */}
      <GlobalSearch />
    </header>
  );
}
