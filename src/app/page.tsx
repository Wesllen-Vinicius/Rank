"use client";

import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Podium from "@/components/podium";
import { supabase } from "@/lib/supabase";
import { rangeToDates, type RangeKey, fmtDate } from "@/lib/utils";

type Row = {
  player_id: string;
  player_name: string;
  wins: number;         // vitórias no período
  games: number;        // partidas jogadas no período
  losses: number;       // games - wins
  winRate: number;      // 0..1
  lastPlayed?: string;  // ISO
  streak: string;       // "W2" | "L1" | "—"
  total_points: number; // = wins (para Badge/Podium)
  rank: number;         // dense rank por vitórias
};

export default function HomePage() {
  const [range, setRange] = useState<RangeKey>("total");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchLeaderboard(r: RangeKey) {
    setLoading(true);
    const { from, to } = rangeToDates(r);

    const { data, error } = await supabase
      .from("match_scores")
      .select(`player_id, is_winner, players(name), matches(played_at)`);

    if (error || !data) {
      console.error(error);
      setRows([]);
      setLoading(false);
      return;
    }

    const filtered = (data as any[]).filter((d) => {
      const playedAt = new Date(d.matches?.played_at ?? 0);
      if (!from) return true;
      return playedAt >= from && (!to || playedAt <= to);
    });

    type Acc = {
      name: string;
      wins: number;
      games: number;
      last?: Date;
      results: { date: Date; w: boolean }[];
    };
    const acc = new Map<string, Acc>();

    filtered.forEach((r: any) => {
      const id = r.player_id as string;
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
      // ordena por vitórias; empates: maior aproveitamento e menos jogos
      .sort((A, B) => (B.wins - A.wins) || (B.winRate - A.winRate) || (A.games - B.games));

    // dense rank por vitórias
    const withRank: Row[] = [];
    let lastPts: number | null = null;
    let currentRank = 0;
    ordered.forEach((r) => {
      if (lastPts === null || r.wins !== lastPts) {
        currentRank += 1;
        lastPts = r.wins;
      }
      withRank.push({ ...r, rank: currentRank });
    });

    setRows(withRank);
    setLoading(false);
  }

  useEffect(() => { fetchLeaderboard(range); }, [range]);

  // Pódio (somente vitórias > 0; suporta empate)
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

  return (
    <div className="space-y-6">
      <Tabs value={range} onValueChange={(v) => setRange(v as RangeKey)} className="w-full">
        <TabsList className="grid grid-cols-4 w-full md:w-auto">
          <TabsTrigger value="day">Hoje</TabsTrigger>
          <TabsTrigger value="week">Semana</TabsTrigger>
          <TabsTrigger value="month">Mês</TabsTrigger>
          <TabsTrigger value="total">Total</TabsTrigger>
        </TabsList>

        <TabsContent value={range} className="space-y-6">
          {top3.length > 0 ? (
            <Podium top3={top3} />
          ) : (
            <Card className="p-4 text-center text-sm text-muted-foreground">
              Sem vitórias neste período.
            </Card>
          )}

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

                {!loading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                      Sem partidas neste período.
                    </TableCell>
                  </TableRow>
                )}

                {!loading && rows.map((r) => (
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
