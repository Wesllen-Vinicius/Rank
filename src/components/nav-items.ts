import type { LucideIcon } from "lucide-react";
import { Home, Users, Joystick, Plus } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon?: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/",        label: "Ranking",   icon: Home },
  { href: "/matches", label: "Registrar", icon: Plus },
  { href: "/players", label: "Jogadores", icon: Users },
  { href: "/games",   label: "Jogos",     icon: Joystick },
];
