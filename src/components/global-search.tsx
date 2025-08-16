"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { supabase } from "@/lib/supabase";
import { User, Gamepad2 } from "lucide-react";

type Player = { id: string; name: string };
type Game = { id: string; name: string };

export default function GlobalSearch() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [players, setPlayers] = React.useState<Player[]>([]);
  const [games, setGames] = React.useState<Game[]>([]);
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  // abre com Ctrl/⌘+K
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // abre via evento global (Navbar dispara)
  React.useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("open-global-search", onOpen as EventListener);
    return () => window.removeEventListener("open-global-search", onOpen as EventListener);
  }, []);

  // busca — players/games por nome
  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const q = query.trim();
      if (!q) {
        setPlayers([]);
        setGames([]);
        return;
      }
      setLoading(true);
      const [pRes, gRes] = await Promise.all([
        supabase.from("players").select("id,name").ilike("name", `%${q}%`).limit(6),
        supabase.from("games").select("id,name").ilike("name", `%${q}%`).limit(6),
      ]);
      if (!cancelled) {
        setPlayers((pRes.data as Player[]) ?? []);
        setGames((gRes.data as Game[]) ?? []);
        setLoading(false);
      }
    };
    const t = setTimeout(run, 150); // debounce leve
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Buscar jogador ou jogo…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>{loading ? "Buscando…" : "Nada encontrado."}</CommandEmpty>

        {players.length > 0 && (
          <CommandGroup heading="Jogadores">
            {players.map((p) => (
              <CommandItem key={p.id} value={`player:${p.name}`} onSelect={() => go("/players")}>
                <User className="mr-2 h-4 w-4" />
                <span>{p.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {players.length > 0 && games.length > 0 && <CommandSeparator />}

        {games.length > 0 && (
          <CommandGroup heading="Jogos">
            {games.map((g) => (
              <CommandItem key={g.id} value={`game:${g.name}`} onSelect={() => go("/games")}>
                <Gamepad2 className="mr-2 h-4 w-4" />
                <span>{g.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
