"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, ClipboardList, Users2, Gamepad2 } from "lucide-react";

type Item = {
  href: string;
  label: string;
  Icon: React.ComponentType<any>;
};

const items: Item[] = [
  { href: "/",         label: "Ranking",  Icon: Trophy },
  { href: "/matches",  label: "Partida",  Icon: ClipboardList },
  { href: "/players",  label: "Jogadores",Icon: Users2 },
  { href: "/games",    label: "Jogos",    Icon: Gamepad2 },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="
        md:hidden fixed bottom-0 left-0 right-0 z-40
        border-t bg-background/90 backdrop-blur
        supports-[padding:env(safe-area-inset-bottom)]:pb-[env(safe-area-inset-bottom)]
      "
    >
      <ul className="grid grid-cols-4">
        {items.map(({ href, label, Icon }) => {
          const active =
            pathname === href ||
            (href !== "/" && pathname?.startsWith(href));
          return (
            <li key={href}>
              <Link
                href={href}
                className={`
                  flex flex-col items-center justify-center gap-1 py-2
                  text-xs
                  ${active ? "text-foreground" : "text-muted-foreground"}
                `}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-5 w-5" />
                <span className="truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
