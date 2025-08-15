"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu } from "lucide-react";

type NavItem = { href: string; label: string };

const items: NavItem[] = [
  { href: "/", label: "Ranking" },
  { href: "/matches", label: "Registrar" },
  { href: "/players", label: "Jogadores" },
  { href: "/games", label: "Jogos" },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="sm:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="bottom" className="w-44">
        {items.map((it) => {
          const active = pathname === it.href;
          return (
            <DropdownMenuItem key={it.href} asChild>
              <Link
                href={it.href}
                className={`block w-full ${active ? "font-medium" : ""}`}
              >
                {it.label}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
