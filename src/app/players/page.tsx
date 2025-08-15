"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type Player = { id: string; name: string };

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("players").select("*").order("name");
    if (error) toast.error("Erro ao carregar jogadores.");
    setPlayers((data as Player[]) ?? []);
    setLoading(false);
  }

  async function addPlayer() {
    if (!name.trim()) {
      toast.warning("Informe um nome.");
      return;
    }
    const { error } = await supabase.from("players").insert({ name: name.trim() });
    if (error) {
      toast.error("Não foi possível adicionar. Nome já existe?");
      return;
    }
    toast.success("Jogador adicionado!");
    setName("");
    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Novo Jogador</h2>
        <div className="flex gap-2">
          <Input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={addPlayer}>Adicionar</Button>
        </div>
        <p className="text-xs text-muted-foreground">Nomes são únicos (ex.: "Wesllen").</p>
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">Jogadores</h2>
        {loading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : (
          <ul className="space-y-2">
            {players.map((p) => (
              <li key={p.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                <span>{p.name}</span>
              </li>
            ))}
            {players.length === 0 && <div className="text-sm text-muted-foreground">Nenhum jogador.</div>}
          </ul>
        )}
      </Card>
    </div>
  );
}
