"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

type Game = { id: string; name: string };

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("games").select("*").order("name");
    if (error) toast.error("Erro ao carregar jogos.");
    setGames((data as Game[]) ?? []);
    setLoading(false);
  }

  async function addGame() {
    const value = name.trim();
    if (!value) return toast.warning("Informe o nome do jogo.");
    setAdding(true);
    const { error } = await supabase.from("games").insert({ name: value });
    setAdding(false);
    if (error) {
      toast.error("Não foi possível adicionar. Nome já existe?");
      return;
    }
    toast.success("Jogo adicionado!");
    setName("");
    load();
  }

  async function removeGame(id: string) {
    if (!id) return;

    // 1) checa se existe partida vinculada
    const { count, error: countErr } = await supabase
      .from("matches")
      .select("id", { head: true, count: "exact" })
      .eq("game_id", id);

    if (countErr) {
      toast.error("Falha ao verificar partidas vinculadas.");
      return;
    }
    if ((count ?? 0) > 0) {
      toast.error(`Não é possível remover: existem ${count} partida${count === 1 ? "" : "s"} usando este jogo.`);
      return;
    }

    // 2) confirma com o usuário
    const ok = window.confirm("Remover este jogo? Esta ação não pode ser desfeita.");
    if (!ok) return;

    // 3) executa o delete e **exige** linhas afetadas
    setRemovingId(id);
    const { data, error } = await supabase
      .from("games")
      .delete()
      .eq("id", id)
      .select("*"); // <- retorna as linhas removidas

    setRemovingId(null);

    if (error) {
      toast.error(`Erro ao remover: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      // nenhuma linha removida => trata como falha
      toast.error("Nada foi removido. Verifique políticas RLS/permite delete.");
      return;
    }

    toast.success("Jogo removido.");
    setGames((prev) => prev.filter((g) => g.id !== id));
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return games;
    return games.filter((g) => g.name.toLowerCase().includes(q));
  }, [games, search]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Novo Jogo */}
      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Novo Jogo</h2>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            addGame();
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <Input
            placeholder="Nome (ex.: Truco, Uno…)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1"
            aria-label="Nome do jogo"
          />
          <Button type="submit" disabled={adding} className="w-full sm:w-auto">
            {adding ? "Adicionando…" : "Adicionar"}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground">
          Dica: nomes devem ser únicos (ex.: “Truco Paulista”, “Uno”).
        </p>
      </Card>

      {/* Lista de Jogos */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="font-semibold">Jogos</h2>
          <div className="w-full sm:w-64">
            <Input
              placeholder="Buscar jogo…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar jogo"
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

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div className="text-sm text-muted-foreground border rounded-md p-3">
            {games.length === 0
              ? "Nenhum jogo cadastrado."
              : "Nenhum jogo encontrado para esse termo."}
          </div>
        )}

        {/* List */}
        {!loading && filtered.length > 0 && (
          <ul className="space-y-2">
            {filtered.map((g) => (
              <li
                key={g.id}
                className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between border rounded-md px-3 py-2"
              >
                <span className="truncate">{g.name}</span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeGame(g.id)}
                    disabled={removingId === g.id}
                    className="w-full sm:w-auto"
                  >
                    {removingId === g.id ? "Removendo…" : "Remover"}
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
