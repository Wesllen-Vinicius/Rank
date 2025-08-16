"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { fmtDate } from "@/lib/utils";
import { toast } from "sonner";
import { Crown, ChevronLeft, ChevronRight } from "lucide-react";

type Player = { id: string; name: string };
type Game = { id: string; name: string };
type Line = { player_id: string; is_winner: boolean };

// ---------- helpers de normalização
type OneOrMany<T> = T | T[] | null | undefined;
const asOne = <T,>(v: OneOrMany<T>): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

type MatchScoreRef = {
  player_id: string;
  is_winner: boolean;
  players: { name: string } | null;
};

type MatchRef = {
  id: string;
  played_at: string;
  day_seq: number | null;
  games: { name: string } | null;
  match_scores: MatchScoreRef[] | null;
};

// forma bruta retornada pelo Supabase (pode ser array nas joins)
type MatchRefRaw = {
  id: string;
  played_at: string;
  day_seq: number | null;
  games: OneOrMany<{ name: string }>;
  match_scores: { is_winner: boolean; player_id: string; players: OneOrMany<{ name: string }> }[] | null;
};

const LS_LAST_GAME = "lastGameId";

function toLocalDatetimeInputValue(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function MatchesPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [gameId, setGameId] = useState<string>("");
  const [playedAt, setPlayedAt] = useState<string>(toLocalDatetimeInputValue());
  const [notes, setNotes] = useState<string>("");

  const [lines, setLines] = useState<Line[]>([]);

  // ---- paginação (coluna “Últimas partidas”)
  const [recent, setRecent] = useState<MatchRef[]>([]);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);
  const [total, setTotal] = useState<number>(0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const [adding, setAdding] = useState(false);
  const [quick, setQuick] = useState("");
  const [quickOpen, setQuickOpen] = useState(false);
  const quickRef = useRef<HTMLInputElement>(null);

  const chosen = useMemo(() => new Set(lines.map((l) => l.player_id)), [lines]);
  const winnersCount = useMemo(() => lines.filter((l) => l.is_winner).length, [lines]);

  const quickSuggestions = useMemo(() => {
    const q = quick.trim().toLowerCase();
    const base = players.filter((p) => !chosen.has(p.id));
    if (!q) return base.slice(0, 5);
    return base.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 5);
  }, [players, chosen, quick]);

  // ---------- carregar listas base
  const loadLists = useCallback(async () => {
    const [p, g] = await Promise.all([
      supabase.from("players").select("*").order("name"),
      supabase.from("games").select("*").order("name"),
    ]);
    setPlayers((p.data as Player[]) ?? []);
    setGames((g.data as Game[]) ?? []);

    const lastGame = typeof window !== "undefined" ? localStorage.getItem(LS_LAST_GAME) : null;
    if (lastGame) setGameId(lastGame);
  }, []);

  // ---------- carregar página de “últimas partidas”
  const loadPage = useCallback(async () => {
    // total (contagem simples de matches)
    const { count } = await supabase.from("matches").select("id", { count: "exact", head: true });
    setTotal(count ?? 0);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data } = await supabase
      .from("matches")
      .select(`id, played_at, day_seq, games(name), match_scores(is_winner, player_id, players(name))`)
      .order("played_at", { ascending: false })
      .range(from, to);

    const raw = (data as unknown as MatchRefRaw[]) ?? [];
    const normalized: MatchRef[] = raw.map((m) => ({
      id: m.id,
      played_at: m.played_at,
      day_seq: m.day_seq,
      games: asOne(m.games),
      match_scores:
        (m.match_scores ?? []).map((s) => ({
          player_id: s.player_id,
          is_winner: s.is_winner,
          players: asOne(s.players),
        })) ?? null,
    }));

    setRecent(normalized);
  }, [page, pageSize]);

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  useEffect(() => {
    if (gameId && typeof window !== "undefined") localStorage.setItem(LS_LAST_GAME, gameId);
  }, [gameId]);

  // ---------- helpers
  function addLine(playerId: string) {
    if (!playerId || chosen.has(playerId)) return;
    setLines((old) => [...old, { player_id: playerId, is_winner: false }]);
  }
  function addOne() {
    const firstFree = players.find((p) => !chosen.has(p.id));
    if (!firstFree) return toast.info("Todos os jogadores já foram adicionados.");
    addLine(firstFree.id);
  }
  function addAll() {
    setLines((old) => {
      const exist = new Set(old.map((l) => l.player_id));
      const toAdd = players.filter((p) => !exist.has(p.id)).map((p) => ({ player_id: p.id, is_winner: false }));
      if (toAdd.length === 0) toast.info("Todos já estão na lista.");
      return [...old, ...toAdd];
    });
  }
  function clearAll() {
    setLines([]);
  }
  function clearWinners() {
    setLines((old) => old.map((l) => ({ ...l, is_winner: false })));
  }
  function setLine(idx: number, patch: Partial<Line>) {
    setLines((old) => old.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }
  function toggleWinner(idx: number) {
    setLines((old) => old.map((l, i) => (i === idx ? { ...l, is_winner: !l.is_winner } : l)));
  }

  // autocomplete
  function handleQuickSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (quickSuggestions.length === 0) return;
    addLine(quickSuggestions[0].id);
    setQuick("");
    setQuickOpen(false);
  }
  function handleQuickBlur() {
    window.setTimeout(() => setQuickOpen(false), 120);
  }

  // Prefill (última partida do jogo selecionado)
  async function prefillFromLastMatch() {
    if (!gameId) return toast.warning("Selecione um jogo primeiro.");
    const { data, error } = await supabase
      .from("matches")
      .select(`id, match_scores(player_id)`)
      .eq("game_id", gameId)
      .order("played_at", { ascending: false })
      .limit(1);
    if (error) return toast.error("Não foi possível buscar a última partida.");
    const last = (data as { id: string; match_scores: { player_id: string }[] }[] | null)?.[0];
    if (!last || !last.match_scores?.length) return toast.info("Nenhuma partida anterior para este jogo.");
    const ids = last.match_scores.map((s) => s.player_id);
    const unique = Array.from(new Set(ids)).filter((id) => players.some((p) => p.id === id));
    setLines(unique.map((id) => ({ player_id: id, is_winner: false })));
    toast.success("Participantes carregados.");
  }

  // salvar
  async function save() {
    if (!gameId) return toast.warning("Selecione um jogo.");
    if (lines.length === 0) return toast.warning("Adicione participantes da partida.");
    if (!lines.some((l) => l.is_winner)) return toast.warning("Marque pelo menos um vencedor.");

    setAdding(true);

    const when = playedAt ? new Date(playedAt) : new Date();

    const { data: match, error } = await supabase
      .from("matches")
      .insert({ game_id: gameId, played_at: when, notes })
      .select()
      .single();

    if (error || !match) {
      setAdding(false);
      return toast.error("Erro ao salvar a partida.");
    }

    const rows = lines.map((l) => ({
      match_id: match.id as string,
      player_id: l.player_id,
      points: l.is_winner ? 1 : 0, // compatibilidade
      is_winner: l.is_winner,
    }));
    const { error: e2 } = await supabase.from("match_scores").insert(rows);
    setAdding(false);
    if (e2) return toast.error("Erro ao salvar os participantes.");

    toast.success(`Partida salva! (#${(match as { day_seq?: number | null }).day_seq ?? "?"} do dia)`);
    setPlayedAt(toLocalDatetimeInputValue());
    setNotes("");
    setLines([]);

    // volta para a primeira página para ver a partida recém-criada
    setPage(1);
    void loadPage();
  }

  return (
    <div className="grid items-start gap-4 md:gap-6 lg:grid-cols-5">
      {/* Coluna principal */}
      <Card className="p-3 md:p-4 lg:col-span-3 self-start space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-lg">Registrar Partida</h2>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void prefillFromLastMatch()}
              disabled={!gameId}
              className="flex-1 sm:flex-none"
              title="Carregar participantes da última partida deste jogo"
            >
              Usar participantes da última
            </Button>
          </div>
        </div>

        {/* Campos do topo */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Jogo</Label>
            <Select value={gameId} onValueChange={setGameId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Selecione o jogo" /></SelectTrigger>
              <SelectContent align="start">
                {games.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Data/Hora</Label>
            <Input type="datetime-local" value={playedAt} onChange={(e) => setPlayedAt(e.target.value)} />
          </div>
        </div>

        {/* Adição rápida */}
        <form onSubmit={handleQuickSubmit} className="space-y-2">
          <Label>Adicionar participante rápido</Label>
          <div className="relative min-w-0">
            <Input
              ref={quickRef}
              placeholder="Digite o nome e Enter…"
              value={quick}
              onChange={(e) => { setQuick(e.target.value); setQuickOpen(true); }}
              onFocus={() => setQuickOpen(true)}
              onBlur={handleQuickBlur}
              aria-label="Adicionar participante por busca"
            />
            {quickOpen && quickSuggestions.length > 0 && (
              <div
                className="absolute z-20 left-0 right-0 mt-1 border rounded-md bg-background shadow max-h-56 overflow-auto"
                role="listbox"
              >
                {quickSuggestions.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { addLine(p.id); setQuick(""); setQuickOpen(false); quickRef.current?.focus(); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                    role="option"
                    aria-selected="false"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Dica: pressione <b>Enter</b> para adicionar o primeiro resultado.
          </div>
        </form>

        {/* Participantes */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-medium">Participantes</h3>
            <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
              <Button variant="secondary" size="sm" onClick={addOne} className="w-full sm:w-auto">+ Jogador</Button>
              <Button variant="outline"   size="sm" onClick={addAll} className="w-full sm:w-auto" disabled={players.length === chosen.size}>Adicionar todos</Button>
              <Button variant="outline"   size="sm" onClick={clearWinners} className="w-full sm:w-auto" disabled={winnersCount === 0}>Limpar vencedores</Button>
              <Button variant="ghost"     size="sm" onClick={clearAll} className="w-full sm:w-auto" disabled={lines.length === 0}>Limpar</Button>
            </div>
          </div>

          {lines.length === 0 && (
            <div className="text-sm text-muted-foreground">Selecione os participantes.</div>
          )}

          <div className="space-y-3">
            {lines.map((l, idx) => {
              const selectedHere = l.player_id;
              const pName = players.find((p) => p.id === l.player_id)?.name ?? "Jogador";
              return (
                <div key={idx} className="grid gap-2 sm:grid-cols-3 items-start border rounded-md p-2 sm:p-3">
                  <div className="sm:col-span-2">
                    <Label className="sr-only">Jogador</Label>
                    <Select value={l.player_id} onValueChange={(v) => setLine(idx, { player_id: v })}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Jogador" /></SelectTrigger>
                      <SelectContent align="start">
                        {players.map((p) => (
                          <SelectItem
                            key={p.id}
                            value={p.id}
                            disabled={chosen.has(p.id) && p.id !== selectedHere}
                          >
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="mt-1 text-xs text-muted-foreground truncate">{pName}</div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={l.is_winner ? "default" : "outline"}
                      onClick={() => toggleWinner(idx)}
                      aria-pressed={l.is_winner}
                      className="w-full sm:w-auto"
                    >
                      <Crown className="mr-2 h-4 w-4" />
                      {l.is_winner ? "Vencedor" : "Marcar vencedor"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setLines((old) => old.filter((_, i) => i !== idx))}
                      className="w-full sm:w-auto"
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-xs sm:text-sm text-muted-foreground flex flex-wrap items-center gap-2">
            <span><b>{lines.length}</b> participante{lines.length === 1 ? "" : "s"}</span>
            <span>•</span>
            <span><b>{winnersCount}</b> vencedor{winnersCount === 1 ? "" : "es"}</span>
          </div>
        </div>

        {/* Observações */}
        <div className="space-y-1.5">
          <Label>Observações (opcional)</Label>
          <Input placeholder="Ex.: melhor de 3, mesa azul…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {/* Barra fixa */}
        <div
          className="
            sticky bottom-0 -mx-3 md:-mx-4 border-t bg-background/85 backdrop-blur
            px-3 md:px-4 py-3
            supports-[padding:env(safe-area-inset-bottom)]:pb-[calc(env(safe-area-inset-bottom)+0.75rem)]
            flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-end
          "
        >
          <div className="text-xs text-muted-foreground sm:hidden">
            Pronto para salvar? {winnersCount > 0 ? `${winnersCount} vencedor(es) marcados.` : "Marque ao menos um vencedor."}
          </div>
          <Button
            onClick={() => void save()}
            disabled={adding || !gameId || lines.length === 0 || winnersCount === 0}
            className="w-full sm:w-auto"
          >
            {adding ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </Card>

      {/* Coluna lateral (últimas partidas) */}
      <Card className="p-3 md:p-4 lg:col-span-2 self-start space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="font-semibold">Últimas partidas</h2>

          {/* controles de paginação */}
          <div className="flex items-center gap-2">
            <Select
              value={String(pageSize)}
              onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}
            >
              <SelectTrigger className="h-8 w-[90px]">
                <SelectValue placeholder="Itens" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="5">5 / pág</SelectItem>
                <SelectItem value="10">10 / pág</SelectItem>
                <SelectItem value="20">20 / pág</SelectItem>
              </SelectContent>
            </Select>

            <div className="text-xs text-muted-foreground tabular-nums">
              {total === 0
                ? "0 de 0"
                : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} de ${total}`}
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                aria-label="Próxima página"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <ul className="space-y-3">
          {recent.map((m) => {
            const scores = m.match_scores ?? [];
            const winners = scores.filter((s) => s.is_winner).map((s) => s.players?.name ?? "—");
            const participants = scores.map((s) => s.players?.name ?? "—");

            return (
              <li key={m.id} className="border rounded-md p-3">
                <div className="text-sm font-medium flex flex-wrap items-center gap-2">
                  <span>{m.games?.name ?? "—"}</span>
                  <span className="text-xs text-muted-foreground">({fmtDate(m.played_at)})</span>
                </div>

                <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">Partida #{m.day_seq ?? "?"} do dia</Badge>
                  {winners.length > 0 && (
                    <span>
                      <span className="font-medium">Vencedores:</span> {winners.join(", ")}
                    </span>
                  )}
                </div>

                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Participantes:</span> {participants.join(", ")}
                </div>
              </li>
            );
          })}
          {recent.length === 0 && (
            <div className="text-sm text-muted-foreground">Sem partidas ainda.</div>
          )}
        </ul>
      </Card>
    </div>
  );
}
