"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

type Player = { id: string; name: string };

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("players").select("*").order("name");
    if (error) toast.error("Erro ao carregar jogadores.");
    setPlayers((data as Player[]) ?? []);
    setLoading(false);
  }

  async function addPlayer() {
    const value = name.trim();
    if (!value) return toast.warning("Informe um nome.");
    setAdding(true);
    const { error } = await supabase.from("players").insert({ name: value });
    setAdding(false);
    if (error) {
      toast.error("Não foi possível adicionar. Nome já existe?");
      return;
    }
    toast.success("Jogador adicionado!");
    setName("");
    load();
  }

  async function removePlayer(id: string) {
    if (!id) return;

    // 1) impede remover se houver partidas vinculadas (match_scores)
    const { count, error: countErr } = await supabase
      .from("match_scores")
      .select("id", { head: true, count: "exact" })
      .eq("player_id", id);

    if (countErr) {
      toast.error("Falha ao verificar partidas vinculadas.");
      return;
    }
    if ((count ?? 0) > 0) {
      toast.error(
        `Não é possível remover: existem ${count} registro${
          count === 1 ? "" : "s"
        } em partidas para este jogador.`
      );
      return;
    }

    // 2) confirma com o usuário
    const ok = window.confirm("Remover este jogador? Esta ação não pode ser desfeita.");
    if (!ok) return;

    // 3) executa delete e EXIGE linhas afetadas (se não vier nada, tratamos como erro)
    setRemovingId(id);
    const { data, error } = await supabase
      .from("players")
      .delete()
      .eq("id", id)
      .select("*"); // <-- retorna as linhas removidas

    setRemovingId(null);

    if (error) {
      toast.error(`Erro ao remover: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      toast.error("Nada foi removido. Verifique políticas RLS/permite delete.");
      return;
    }

    toast.success("Jogador removido.");
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return players;
    return players.filter((p) => p.name.toLowerCase().includes(q));
  }, [players, search]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Novo Jogador */}
      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Novo Jogador</h2>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            addPlayer();
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <Input
            placeholder="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1"
            aria-label="Nome do jogador"
          />
          <Button type="submit" disabled={adding} className="w-full sm:w-auto">
            {adding ? "Adicionando…" : "Adicionar"}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground">Nomes são únicos (ex.: "Wesllen").</p>
      </Card>

      {/* Lista de Jogadores */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="font-semibold">Jogadores</h2>
          <div className="w-full sm:w-64">
            <Input
              placeholder="Buscar jogador…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar jogador"
            />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-10 rounded" />
            <Skeleton className="h-10 rounded" />
            <Skeleton className="h-10 rounded" />
          </div>
        )}

        {/* Empty / No match */}
        {!loading && filtered.length === 0 && (
          <div className="text-sm text-muted-foreground border rounded-md p-3">
            {players.length === 0
              ? "Nenhum jogador cadastrado."
              : "Nenhum jogador encontrado para esse termo."}
          </div>
        )}

        {/* List */}
        {!loading && filtered.length > 0 && (
          <ul className="space-y-2">
            {filtered.map((p) => (
              <li
                key={p.id}
                className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between border rounded-md px-3 py-2"
              >
                <span className="truncate">{p.name}</span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removePlayer(p.id)}
                    disabled={removingId === p.id}
                    className="w-full sm:w-auto"
                  >
                    {removingId === p.id ? "Removendo…" : "Remover"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
