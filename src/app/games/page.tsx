"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type Game = { id: string; name: string };

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("games").select("*").order("name");
    if (error) toast.error("Erro ao carregar jogos.");
    setGames((data as Game[]) ?? []);
    setLoading(false);
  }

  async function addGame() {
    if (!name.trim()) {
      toast.warning("Informe o nome do jogo.");
      return;
    }
    const { error } = await supabase.from("games").insert({ name: name.trim() });
    if (error) {
      toast.error("Não foi possível adicionar. Nome já existe?");
      return;
    }
    toast.success("Jogo adicionado!");
    setName("");
    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Novo Jogo</h2>
        <div className="flex gap-2">
          <Input placeholder="Nome (ex.: Truco, Uno…)" value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={addGame}>Adicionar</Button>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">Jogos</h2>
        {loading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : (
          <ul className="space-y-2">
            {games.map((g) => (
              <li key={g.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                <span>{g.name}</span>
              </li>
            ))}
            {games.length === 0 && <div className="text-sm text-muted-foreground">Nenhum jogo.</div>}
          </ul>
        )}
      </Card>
    </div>
  );
}
