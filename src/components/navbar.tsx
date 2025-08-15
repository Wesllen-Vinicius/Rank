"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle"; // <— novo

const links = [
  { href: "/", label: "Ranking" },
  { href: "/matches", label: "Registrar Partida" },
  { href: "/players", label: "Jogadores" },
  { href: "/games", label: "Jogos" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="w-full sticky top-0 z-30 bg-background/70 backdrop-blur border-b">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Trophy className="h-5 w-5" />
          Placar de Amigos
        </Link>

        <nav className="hidden md:flex items-center gap-2">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={
                  "text-sm px-3 py-1.5 rounded-md hover:bg-muted transition " +
                  (active ? "bg-muted font-medium" : "")
                }
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <ModeToggle /> {/* <— botão de tema */}
          <div className="md:hidden">
            <Button asChild variant="outline" size="sm">
              <Link href="/matches">+ Partida</Link>
            </Button>
          </div>
        </div>
      </div>
      <Separator />
    </header>
  );
}
