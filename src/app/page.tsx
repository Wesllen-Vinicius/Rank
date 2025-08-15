"use client";

import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Podium from "@/components/podium";
import { supabase } from "@/lib/supabase";
import { rangeToDates, type RangeKey, fmtDate } from "@/lib/utils";

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

type Game = { id: string; name: string };
type RangeKeyPlus = RangeKey | "custom";
const ALL_GAMES = "__all__";

// ---------- helpers de normalização
type OneOrMany<T> = T | T[] | null | undefined;
const asOne = <T,>(v: OneOrMany<T>): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

// form bruto que pode vir do Supabase
type ScoreFetchRaw = {
  match_id: string;
  player_id: string;
  is_winner: boolean;
  players: OneOrMany<{ name: string }>;
  matches: OneOrMany<{ played_at: string; game_id: string }>;
};

// forma já normalizada
type ScoreFetch = {
  match_id: string;
  player_id: string;
  is_winner: boolean;
  players: { name: string } | null;
  matches: { played_at: string; game_id: string } | null;
};

export default function HomePage() {
  const [range, setRange] = useState<RangeKeyPlus>("total");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [gameId, setGameId] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  const [games, setGames] = useState<Game[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const [matchesCount, setMatchesCount] = useState(0);
  const [playersCount, setPlayersCount] = useState(0);
  const [winsCount, setWinsCount] = useState(0);

  function computeRangeDates(r: RangeKeyPlus) {
    if (r !== "custom") return rangeToDates(r);
    const from = customFrom ? new Date(`${customFrom}T00:00:00`) : undefined;
    const to = customTo ? new Date(`${customTo}T23:59:59.999`) : undefined;
    return { from, to };
  }

  async function fetchLeaderboard(r: RangeKeyPlus) {
    setLoading(true);

    let query = supabase
      .from("match_scores")
      .select(`match_id, player_id, is_winner, players(name), matches(played_at, game_id)`);

    if (gameId) query = query.eq("matches.game_id", gameId);

    const { data, error } = await query;

    if (error || !data) {
      console.error(error);
      setRows([]);
      setMatchesCount(0);
      setPlayersCount(0);
      setWinsCount(0);
      setLoading(false);
      return;
    }

    const raw = data as unknown as ScoreFetchRaw[];
    const normalized: ScoreFetch[] = raw.map((r) => ({
      match_id: r.match_id,
      player_id: r.player_id,
      is_winner: r.is_winner,
      players: asOne(r.players),
      matches: asOne(r.matches),
    }));

    const { from, to } = computeRangeDates(r);

    const filtered = normalized.filter((d) => {
      const playedAt = new Date(d.matches?.played_at ?? 0);
      const okDate = !from ? true : playedAt >= from && (!to || playedAt <= to);
      const okGame = !gameId ? true : d.matches?.game_id === gameId;
      return okDate && okGame;
    });

    setMatchesCount(new Set(filtered.map((x) => x.match_id)).size);
    setPlayersCount(new Set(filtered.map((x) => x.player_id)).size);
    setWinsCount(filtered.reduce((s, x) => s + (x.is_winner ? 1 : 0), 0));

    type Acc = {
      name: string;
      wins: number;
      games: number;
      last?: Date;
      results: { date: Date; w: boolean }[];
    };
    const acc = new Map<string, Acc>();

    filtered.forEach((r) => {
      const id = r.player_id;
      const name = r.players?.name ?? "Jogador";
      const w = !!r.is_winner;
      const date = new Date(r.matches?.played_at ?? 0);

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
        if (a.results.length > 0) {
          const lastWin = a.results[a.results.length - 1].w;
          let n = 0;
          for (let i = a.results.length - 1; i >= 0; i--) {
            if (a.results[i].w === lastWin) n++;
            else break;
          }
          streak = (lastWin ? "W" : "L") + n;
        }
        const games = a.games;
        const wins = a.wins;
        const losses = games - wins;
        const winRate = games ? wins / games : 0;

        return {
          player_id,
          player_name: a.name,
          wins,
          games,
          losses,
          winRate,
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
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("games").select("*").order("name");
      setGames((data as Game[]) ?? []);
    })();
  }, []);

  useEffect(() => {
    void fetchLeaderboard(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, customFrom, customTo, gameId]);

  const rowsFilteredBySearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.player_name.toLowerCase().includes(q));
  }, [rows, search]);

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

  const summary = useMemo(() => {
    const totalPlayers = rows.length;
    return [
      { label: "Partidas", value: matchesCount },
      { label: "Jogadores", value: playersCount },
      { label: "Vitórias", value: winsCount },
      { label: "No ranking", value: totalPlayers },
    ];
  }, [matchesCount, playersCount, winsCount, rows]);

  return (
    <div className="space-y-6">
      <Tabs value={range} onValueChange={(v) => setRange(v as RangeKeyPlus)} className="w-full">
        <TabsList className="grid grid-cols-5 w-full md:w-auto">
          <TabsTrigger value="day">Hoje</TabsTrigger>
          <TabsTrigger value="week">Semana</TabsTrigger>
          <TabsTrigger value="month">Mês</TabsTrigger>
          <TabsTrigger value="total">Total</TabsTrigger>
          <TabsTrigger value="custom">Personalizado</TabsTrigger>
        </TabsList>

        <TabsContent value={range} className="space-y-6">
          {/* Filtros */}
          <Card className="p-3 md:p-4">
            <div className="grid gap-3 md:grid-cols-4">
              {/* Jogo */}
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

              {/* Datas (só ativa no personalizado) */}
              <div className={range === "custom" ? "" : "opacity-60 pointer-events-none"}>
                <div className="text-xs mb-1 text-muted-foreground">De</div>
                <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              </div>
              <div className={range === "custom" ? "" : "opacity-60 pointer-events-none"}>
                <div className="text-xs mb-1 text-muted-foreground">Até</div>
                <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
              </div>

              {/* Busca */}
              <div>
                <div className="text-xs mb-1 text-muted-foreground">Buscar jogador</div>
                <Input placeholder="Nome do jogador…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>

            {/* resumo */}
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {summary.map((s) => (
                <span key={s.label} className="inline-flex items-center gap-1">
                  <span className="font-medium">{s.value}</span> {s.label}
                </span>
              ))}
            </div>
          </Card>

          {/* Pódio */}
          {top3.length > 0 ? (
            <Podium top3={top3} />
          ) : (
            <Card className="p-4 text-center text-sm text-muted-foreground">Sem vitórias neste período.</Card>
          )}

          {/* Tabela */}
          <Card className="p-0 overflow-hidden">
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

                {!loading && rowsFilteredBySearch.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                      Sem partidas neste período.
                    </TableCell>
                  </TableRow>
                )}

                {!loading &&
                  rowsFilteredBySearch.map((r) => (
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
    </div>
  );
}
