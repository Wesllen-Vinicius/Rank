"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

type Player = { id: string; name: string };

const PAGE_SIZE = 12;

export default function PlayersPage() {
  // form
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);

  // list + paginação
  const [players, setPlayers] = useState<Player[]>([]);
  const [search, setSearch] = useState("");
  const [listLoading, setListLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const lastPage = Math.max(Math.ceil(total / PAGE_SIZE) - 1, 0);
  const canPrev = page > 0;
  const canNext = page < lastPage;
  const showingFrom = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const showingTo = total === 0 ? 0 : Math.min((page + 1) * PAGE_SIZE, total);

  async function loadPlayers(targetPage = page, currentSearch = search) {
    setListLoading(true);

    const from = targetPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase.from("players").select("*", { count: "exact" });

    const q = currentSearch.trim();
    if (q) query = query.ilike("name", `%${q}%`);

    const { data, error, count } = await query.order("name").range(from, to);

    if (error) {
      toast.error("Erro ao carregar jogadores.");
      setPlayers([]);
      setTotal(0);
      setListLoading(false);
      return;
    }

    setPlayers((data as Player[]) ?? []);
    setTotal(count ?? 0);
    setListLoading(false);
  }

  useEffect(() => {
    // primeira carga
    loadPlayers(0, search);
  }, []);

  useEffect(() => {
    // ao mudar page OU termo de busca, recarrega
    loadPlayers(page, search);
  }, [page]);

  // para busca: sempre que o usuário digitar, volta para a página 1
  useEffect(() => {
    setPage(0);
    loadPlayers(0, search);
  }, [search]);

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
    // volta pra primeira página para ver a lista atualizada em ordem alfabética
    setPage(0);
    loadPlayers(0, search);
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
        `Não é possível remover: existem ${count} registro${count === 1 ? "" : "s"} em partidas para este jogador.`
      );
      return;
    }

    // 2) confirma com o usuário
    const ok = window.confirm("Remover este jogador? Esta ação não pode ser desfeita.");
    if (!ok) return;

    // 3) executa delete e EXIGE linhas afetadas
    setRemovingId(id);
    const { data, error } = await supabase.from("players").delete().eq("id", id).select("*");
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

    // recalcula página atual se o total diminuir
    const newTotal = Math.max(total - 1, 0);
    const newLastPage = Math.max(Math.ceil(newTotal / PAGE_SIZE) - 1, 0);
    const target = Math.min(page, newLastPage);
    setPage(target);
    loadPlayers(target, search);
  }

  const emptyStateText = useMemo(() => {
    if (listLoading) return "";
    if (players.length > 0) return "";
    return search.trim()
      ? "Nenhum jogador encontrado para esse termo."
      : "Nenhum jogador cadastrado.";
  }, [listLoading, players, search]);

  return (
    <div className="grid gap-6 lg:grid-cols-2 items-start">
      {/* Novo Jogador (não “estica” junto com a lista) */}
      <Card className="p-4 space-y-3 self-start">
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

      {/* Lista de Jogadores (com paginação, e sem esticar com o card ao lado) */}
      <Card className="p-4 space-y-3 self-start">
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
        {listLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 rounded" />
            <Skeleton className="h-10 rounded" />
            <Skeleton className="h-10 rounded" />
          </div>
        )}

        {/* Empty / No match */}
        {!listLoading && players.length === 0 && (
          <div className="text-sm text-muted-foreground border rounded-md p-3">
            {emptyStateText}
          </div>
        )}

        {/* List */}
        {!listLoading && players.length > 0 && (
          <>
            <ul className="space-y-2">
              {players.map((p) => (
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

            {/* Paginação */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t">
              <div className="text-xs text-muted-foreground">
                {showingFrom}–{showingTo} de {total}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(p - 1, 0))}
                  disabled={!canPrev}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(p + 1, lastPage))}
                  disabled={!canNext}
                >
                  Próxima
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
