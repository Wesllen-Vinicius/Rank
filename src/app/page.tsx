"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import Podium from "@/components/podium";

import { supabase } from "@/lib/supabase";
import { rangeToDates, type RangeKey, fmtDate } from "@/lib/utils";
import SharePodium from "@/components/share-podium";

/* =========================
   Tipos compartilhados
========================= */

type Game = { id: string; name: string };
type RangeKeyPlus = RangeKey | "custom";

type Row = {
  player_id: string;
  player_name: string;
  wins: number;
  games: number;
  losses: number;
  winRate: number;
  lastPlayed?: string;
  streak: string;
  total_points: number;
  rank: number;
};

type OneOrMany<T> = T | T[] | null | undefined;
const asOne = <T,>(v: OneOrMany<T>): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

/* ----- Leaderboard (scores) ----- */
type ScoreFetchRaw = {
  match_id: string;
  player_id: string;
  is_winner: boolean;
  players: OneOrMany<{ name: string }>;
  matches: OneOrMany<{ played_at: string; game_id: string }>;
};
type ScoreFetch = {
  match_id: string;
  player_id: string;
  is_winner: boolean;
  players: { name: string } | null;
  matches: { played_at: string; game_id: string } | null;
};

/* ----- Feed (matches) ----- */
type MatchScoreRef = { is_winner: boolean; players: { name: string } | null };
type MatchRef = {
  id: string;
  played_at: string;
  day_seq: number | null;
  games: { name: string } | null;
  match_scores: MatchScoreRef[];
};
type MatchRefRaw = {
  id: string;
  played_at: string;
  day_seq: number | null;
  games: OneOrMany<{ name: string }>;
  match_scores: { is_winner: boolean; players: OneOrMany<{ name: string }> }[] | null;
};

/* =========================
   Constantes
========================= */

const ALL_GAMES = "__all__";
const LS_FILTERS_KEY = "rank.filters.v1";

/* =========================
   Página
========================= */

export default function HomePage() {
  /* -------- Top-level view (Ranking | Feed) -------- */
  const [view, setView] = useState<"ranking" | "feed">("ranking");

  /* -------- Filtros do Ranking -------- */
  const [range, setRange] = useState<RangeKeyPlus>("total");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [gameId, setGameId] = useState("");
  const [search, setSearch] = useState("");

  /* -------- Filtros do Feed -------- */
  const [feedGameId, setFeedGameId] = useState("");
  const [feedFrom, setFeedFrom] = useState("");
  const [feedTo, setFeedTo] = useState("");

  /* -------- Dados base -------- */
  const [games, setGames] = useState<Game[]>([]);

  /* -------- Leaderboard state -------- */
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchesCount, setMatchesCount] = useState(0);
  const [playersCount, setPlayersCount] = useState(0);
  const [winsCount, setWinsCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  /* -------- Feed state (server-side paginação) -------- */
  const [feedRows, setFeedRows] = useState<MatchRef[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedPage, setFeedPage] = useState(1);
  const [feedPageSize, setFeedPageSize] = useState(10);
  const [feedTotal, setFeedTotal] = useState(0);

  /* =========================
     Carregar lista de jogos
  ========================= */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("games").select("*").order("name");
      setGames((data as Game[]) ?? []);
    })();
  }, []);

  /* =========================
     Persistir filtros do Ranking
  ========================= */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_FILTERS_KEY);
      if (raw) {
        const f = JSON.parse(raw) as {
          range?: RangeKeyPlus;
          customFrom?: string;
          customTo?: string;
          gameId?: string;
          pageSize?: number;
        };
        if (f.range) setRange(f.range);
        if (f.customFrom) setCustomFrom(f.customFrom);
        if (f.customTo) setCustomTo(f.customTo);
        if (typeof f.gameId === "string") setGameId(f.gameId);
        if (typeof f.pageSize === "number") setPageSize(f.pageSize);
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(LS_FILTERS_KEY, JSON.stringify({ range, customFrom, customTo, gameId, pageSize }));
    } catch {}
  }, [range, customFrom, customTo, gameId, pageSize]);

  /* =========================
     Leaderboard (Ranking)
  ========================= */
  const computeRangeDates = (r: RangeKeyPlus) =>
    r !== "custom"
      ? rangeToDates(r)
      : {
          from: customFrom ? new Date(`${customFrom}T00:00:00`) : undefined,
          to: customTo ? new Date(`${customTo}T23:59:59.999`) : undefined,
        };

  const fetchLeaderboard = useCallback(
    async (r: RangeKeyPlus) => {
      setLoading(true);
      let query = supabase
        .from("match_scores")
        .select(`match_id, player_id, is_winner, players(name), matches(played_at, game_id)`);
      if (gameId) query = query.eq("matches.game_id", gameId);

      const { data, error } = await query;
      if (error || !data) {
        setRows([]);
        setMatchesCount(0);
        setPlayersCount(0);
        setWinsCount(0);
        setLoading(false);
        return;
      }

      const normalized: ScoreFetch[] = (data as ScoreFetchRaw[]).map((r0) => ({
        match_id: r0.match_id,
        player_id: r0.player_id,
        is_winner: r0.is_winner,
        players: asOne(r0.players),
        matches: asOne(r0.matches),
      }));

      const { from, to } = computeRangeDates(r);
      const filtered = normalized.filter((d) => {
        const playedAt = new Date(d.matches?.played_at ?? 0);
        return (!from || playedAt >= from) && (!to || playedAt <= to) && (!gameId || d.matches?.game_id === gameId);
      });

      setMatchesCount(new Set(filtered.map((x) => x.match_id)).size);
      setPlayersCount(new Set(filtered.map((x) => x.player_id)).size);
      setWinsCount(filtered.reduce((s, x) => s + (x.is_winner ? 1 : 0), 0));

      type Acc = { name: string; wins: number; games: number; last?: Date; results: { date: Date; w: boolean }[] };
      const acc = new Map<string, Acc>();

      filtered.forEach((r1) => {
        const id = r1.player_id;
        const name = r1.players?.name ?? "Jogador";
        const w = !!r1.is_winner;
        const date = new Date(r1.matches?.played_at ?? 0);
        if (!acc.has(id)) acc.set(id, { name, wins: 0, games: 0, results: [], last: undefined });
        const a = acc.get(id)!;
        a.games += 1;
        if (w) a.wins += 1;
        a.results.push({ date, w });
        if (!a.last || date > a.last) a.last = date;
      });

      const ordered = [...acc.entries()]
        .map(([player_id, a]) => {
          a.results.sort((x, y) => x.date.getTime() - y.date.getTime());
          let streak = "—";
          if (a.results.length) {
            const lastWin = a.results[a.results.length - 1].w;
            let n = 0;
            for (let i = a.results.length - 1; i >= 0 && a.results[i].w === lastWin; i--) n++;
            streak = (lastWin ? "W" : "L") + n;
          }
          const wins = a.wins;
          const games = a.games;
          return {
            player_id,
            player_name: a.name,
            wins,
            games,
            losses: games - wins,
            winRate: games ? wins / games : 0,
            lastPlayed: a.last?.toISOString(),
            streak,
            total_points: wins,
          } as Row;
        })
        .sort((A, B) => B.wins - A.wins || B.winRate - A.winRate || A.games - B.games);

      // dense rank
      const withRank: Row[] = [];
      let lastPts: number | null = null;
      let currentRank = 0;
      ordered.forEach((r2) => {
        if (lastPts === null || r2.wins !== lastPts) {
          currentRank += 1;
          lastPts = r2.wins;
        }
        withRank.push({ ...r2, rank: currentRank });
      });

      setRows(withRank);
      setLoading(false);
    },
    [customFrom, customTo, gameId]
  );

  useEffect(() => {
    void fetchLeaderboard(range);
  }, [range, fetchLeaderboard]);

  // Realtime (ranking)
  useEffect(() => {
    const ch = supabase
      .channel("rank-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "matches" }, () => fetchLeaderboard(range))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "match_scores" }, () => fetchLeaderboard(range))
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [fetchLeaderboard, range]);

  // Busca + paginação (ranking)
  const rowsFilteredBySearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter((r) => r.player_name.toLowerCase().includes(q)) : rows;
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(rowsFilteredBySearch.length / pageSize));
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rowsFilteredBySearch.slice(start, start + pageSize);
  }, [rowsFilteredBySearch, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [rowsFilteredBySearch.length, pageSize]);

  // Pódio + textos para compartilhamento
  const top3 = useMemo(() => {
    const byRank = new Map<number, Row[]>();
    rows.forEach((r) => {
      if (!byRank.has(r.rank)) byRank.set(r.rank, []);
      byRank.get(r.rank)!.push(r);
    });
    return [1, 2, 3]
      .map((rk) => {
        const g = byRank.get(rk) ?? [];
        if (!g.length || g[0].wins <= 0) return null;
        return { name: g.map((x) => x.player_name).join(", "), points: g[0].wins };
      })
      .filter(Boolean) as { name: string; points: number }[];
  }, [rows]);

  const gameLabel = useMemo(
    () => (gameId ? games.find((g) => g.id === gameId)?.name ?? "Jogo" : "Todos os jogos"),
    [gameId, games]
  );

  const rangeLabel = useMemo(() => {
    if (range === "day") return "Hoje";
    if (range === "week") return "Semana";
    if (range === "month") return "Mês";
    if (range === "total") return "Total";
    // custom
    const from = customFrom ? customFrom.split("-").reverse().join("/") : "";
    const to = customTo ? customTo.split("-").reverse().join("/") : "";
    return from || to ? `${from || "…"} — ${to || "…"}` : "Personalizado";
  }, [range, customFrom, customTo]);

  const summary = useMemo(
    () => [
      { label: "Partidas", value: matchesCount },
      { label: "Jogadores", value: playersCount },
      { label: "Vitórias", value: winsCount },
      { label: "No ranking", value: rows.length },
    ],
    [matchesCount, playersCount, winsCount, rows.length]
  );

  /* =========================
     Feed (partidas recentes)
  ========================= */
  const fetchFeed = useCallback(async () => {
    setFeedLoading(true);

    const fromISO = feedFrom ? `${feedFrom}T00:00:00` : undefined;
    const toISO = feedTo ? `${feedTo}T23:59:59.999` : undefined;

    let q = supabase
      .from("matches")
      .select(`id, played_at, day_seq, games(name), match_scores(is_winner, players(name))`, {
        count: "exact",
      })
      .order("played_at", { ascending: false });

    if (feedGameId) q = q.eq("game_id", feedGameId);
    if (fromISO) q = q.gte("played_at", fromISO);
    if (toISO) q = q.lte("played_at", toISO);

    const from = (feedPage - 1) * feedPageSize;
    const to = from + feedPageSize - 1;
    q = q.range(from, to);

    const { data, count, error } = await q;
    if (error || !data) {
      setFeedRows([]);
      setFeedTotal(0);
      setFeedLoading(false);
      return;
    }

    const normalized: MatchRef[] = (data as MatchRefRaw[]).map((m) => ({
      id: m.id,
      played_at: m.played_at,
      day_seq: m.day_seq,
      games: asOne(m.games),
      match_scores:
        (m.match_scores ?? []).map((s) => ({
          is_winner: s.is_winner,
          players: asOne(s.players),
        })) ?? [],
    }));

    setFeedRows(normalized);
    setFeedTotal(count ?? 0);
    setFeedLoading(false);
  }, [feedGameId, feedFrom, feedTo, feedPage, feedPageSize]);

  // primeira carga ao entrar no feed
  useEffect(() => {
    if (view === "feed") void fetchFeed();
  }, [view, fetchFeed]);

  // paginação do feed (busca automática ao mudar page/size)
  useEffect(() => {
    if (view === "feed") void fetchFeed();
  }, [feedPage, feedPageSize, view, fetchFeed]);

  // reset página ao trocar filtros do feed
  useEffect(() => {
    setFeedPage(1);
    if (view === "feed") void fetchFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedGameId, feedFrom, feedTo, view]);

  const feedTotalPages = Math.max(1, Math.ceil(feedTotal / feedPageSize));

  /* =========================
     UI
  ========================= */
  return (
    <div className="space-y-6">
      {/* Tabs de nível superior: Ranking | Feed */}
      <Tabs value={view} onValueChange={(v) => setView(v as "ranking" | "feed")}>
        <TabsList className="w-full md:w-auto grid grid-cols-2">
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
          <TabsTrigger value="feed">Feed</TabsTrigger>
        </TabsList>

        {/* ===== RANKING ===== */}
        <TabsContent value="ranking" className="space-y-6">
          {/* Filtros do ranking */}
          <Tabs value={range} onValueChange={(v) => setRange(v as RangeKeyPlus)} className="w-full">
            <TabsList className="grid grid-cols-5 w-full md:w-auto">
              <TabsTrigger value="day">Hoje</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
              <TabsTrigger value="month">Mês</TabsTrigger>
              <TabsTrigger value="total">Total</TabsTrigger>
              <TabsTrigger value="custom">Personalizado</TabsTrigger>
            </TabsList>

            <TabsContent value={range} className="space-y-6">
              <Card className="p-3 md:p-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <div>
                    <div className="text-xs mb-1 text-muted-foreground">Jogo</div>
                    <Select value={gameId || ALL_GAMES} onValueChange={(v) => setGameId(v === ALL_GAMES ? "" : v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Todos os jogos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_GAMES}>Todos</SelectItem>
                        {games.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className={range === "custom" ? "" : "opacity-60 pointer-events-none"}>
                    <div className="text-xs mb-1 text-muted-foreground">De</div>
                    <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
                  </div>
                  <div className={range === "custom" ? "" : "opacity-60 pointer-events-none"}>
                    <div className="text-xs mb-1 text-muted-foreground">Até</div>
                    <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
                  </div>

                  <div>
                    <div className="text-xs mb-1 text-muted-foreground">Buscar jogador</div>
                    <Input placeholder="Nome do jogador…" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {summary.map((s) => (
                    <span key={s.label} className="inline-flex items-center gap-1">
                      <span className="font-medium">{s.value}</span> {s.label}
                    </span>
                  ))}
                </div>
              </Card>

              {top3.length > 0 ? (
                <>
                  <Podium top3={top3} />
                  <SharePodium
                    top3={top3}
                    title={`Pódio — ${gameLabel}`}
                    subtitle={`${rangeLabel} • ${winsCount} vitória${winsCount === 1 ? "" : "s"} • ${matchesCount} partida${matchesCount === 1 ? "" : "s"}`}
                  />
                </>
              ) : (
                <Card className="p-4 text-center text-sm text-muted-foreground">Sem vitórias neste período.</Card>
              )}

              <Card className="p-0 overflow-hidden">
                {/* Barra superior: paginação e page size */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 md:px-4 py-3 border-b">
                  <div className="text-sm text-muted-foreground">{rowsFilteredBySearch.length} resultado(s)</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Por página</span>
                    <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                      <SelectTrigger className="h-8 w-[84px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[10, 25, 50, 100].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                        Anterior
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        Página <b>{page}</b> / {Math.max(1, totalPages)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                      >
                        Próxima
                      </Button>
                    </div>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Jogador</TableHead>
                      <TableHead className="text-right">Vitórias</TableHead>
                      <TableHead className="text-right">Partidas</TableHead>
                      <TableHead className="text-right">Aproveitamento</TableHead>
                      <TableHead className="text-right">Sequência</TableHead>
                      <TableHead className="text-right">Último jogo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                          Carregando…
                        </TableCell>
                      </TableRow>
                    )}
                    {!loading && pageRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                          Sem partidas neste período.
                        </TableCell>
                      </TableRow>
                    )}
                    {!loading &&
                      pageRows.map((r) => (
                        <TableRow key={r.player_id}>
                          <TableCell className="w-10">{r.rank}</TableCell>
                          <TableCell className="font-medium">
                            {r.player_name}
                            <div className="text-xs text-muted-foreground">
                              {r.wins} vitória{r.wins === 1 ? "" : "s"} • {r.games} partida{r.games === 1 ? "" : "s"}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">{r.wins}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{r.games}</TableCell>
                          <TableCell className="text-right">{(r.winRate * 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-right">{r.streak}</TableCell>
                          <TableCell className="text-right">{r.lastPlayed ? fmtDate(r.lastPlayed) : "—"}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ===== FEED ===== */}
        <TabsContent value="feed" className="space-y-6">
          <Card className="p-3 md:p-4">
            <div className="grid gap-3 md:grid-cols-5">
              {/* Jogo */}
              <div>
                <div className="text-xs mb-1 text-muted-foreground">Jogo</div>
                <Select value={feedGameId || ALL_GAMES} onValueChange={(v) => setFeedGameId(v === ALL_GAMES ? "" : v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos os jogos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_GAMES}>Todos</SelectItem>
                    {games.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* De / Até */}
              <div>
                <div className="text-xs mb-1 text-muted-foreground">De</div>
                <Input type="date" value={feedFrom} onChange={(e) => setFeedFrom(e.target.value)} />
              </div>
              <div>
                <div className="text-xs mb-1 text-muted-foreground">Até</div>
                <Input type="date" value={feedTo} onChange={(e) => setFeedTo(e.target.value)} />
              </div>

              {/* Page size + Atualizar */}
              <div>
                <div className="text-xs mb-1 text-muted-foreground">Por página</div>
                <Select value={String(feedPageSize)} onValueChange={(v) => setFeedPageSize(Number(v))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 20, 50].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button className="w-full" variant="outline" onClick={() => { setFeedPage(1); void fetchFeed(); }}>
                  Atualizar
                </Button>
              </div>
            </div>

            {/* Paginação */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">
                {feedTotal} partida{feedTotal === 1 ? "" : "s"} no período
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFeedPage((p) => Math.max(1, p - 1))}
                  disabled={feedPage <= 1 || feedLoading}
                >
                  Anterior
                </Button>
                <span className="text-xs text-muted-foreground">
                  Página <b>{feedPage}</b> / {feedTotalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFeedPage((p) => Math.min(feedTotalPages, p + 1))}
                  disabled={feedLoading || feedPage >= feedTotalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          </Card>

          {/* Lista de partidas */}
          <Card className="p-3 md:p-4">
            {feedLoading && <div className="text-sm text-muted-foreground py-2">Carregando…</div>}

            {!feedLoading && feedRows.length === 0 && (
              <div className="text-sm text-muted-foreground py-2">Sem partidas no período.</div>
            )}

            <ul className="space-y-3">
              {feedRows.map((m) => {
                const winners = (m.match_scores ?? []).filter((s) => s.is_winner).map((s) => s.players?.name ?? "—");
                const participants = (m.match_scores ?? []).map((s) => s.players?.name ?? "—");
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
            </ul>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
