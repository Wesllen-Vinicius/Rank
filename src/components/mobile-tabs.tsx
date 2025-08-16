"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Gamepad2 } from "lucide-react";

const TABS = [
  { href: "/", label: "Ranking", icon: Home },
  { href: "/players", label: "Jogadores", icon: Users },
  { href: "/games", label: "Jogos", icon: Gamepad2 },
];

export default function MobileTabs() {
  const pathname = usePathname();

  return (
    <nav
      className="
        fixed bottom-0 left-0 right-0 z-40
        border-t bg-background/95 backdrop-blur
        md:hidden
        h-[var(--btm-h)] pb-[env(safe-area-inset-bottom)]
      "
      aria-label="Navegação inferior"
    >
      <ul className="mx-auto grid max-w-5xl grid-cols-3">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <li key={href}>
              <Link
                href={href}
                className="
                  flex h-14 flex-col items-center justify-center gap-1
                  text-xs data-[active=true]:font-medium
                "
                data-active={active}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
