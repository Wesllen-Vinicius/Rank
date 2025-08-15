"use client";

import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Podium from "@/components/podium";
import { supabase } from "@/lib/supabase";
import { rangeToDates, type RangeKey } from "@/lib/utils";

type Row = {
  player_id: string;
  player_name: string;
  total_points: number;
  rank: number; // <-- posição considerando empates (dense rank)
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
      .select(`player_id, points, players(name), matches(played_at)`);

    if (error || !data) {
      console.error(error);
      setRows([]);
      setLoading(false);
      return;
    }

    // filtra por período no cliente
    const filtered = (data as any[]).filter((d) => {
      const playedAt = new Date(d.matches?.played_at ?? 0);
      if (!from) return true;
      return playedAt >= from && (!to || playedAt <= to);
    });

    // agrega por jogador
    const map = new Map<string, { name: string; total: number }>();
    filtered.forEach((r) => {
      const id = r.player_id as string;
      const name = r.players?.name ?? "Jogador";
      const pts = Number(r.points) || 0;
      map.set(id, { name, total: (map.get(id)?.total ?? 0) + pts });
    });

    const ordered = [...map.entries()]
      .map(([player_id, v]) => ({ player_id, player_name: v.name, total_points: v.total }))
      .sort((a, b) => b.total_points - a.total_points);

    // ---- DENSE RANK (1,1,2,3… sem “buracos”)
    const withRank: Row[] = [];
    let lastPts: number | null = null;
    let currentRank = 0; // rank da “faixa” atual
    ordered.forEach((r) => {
      if (lastPts === null || r.total_points !== lastPts) {
        currentRank += 1;
        lastPts = r.total_points;
      }
      withRank.push({ ...r, rank: currentRank });
    });

    setRows(withRank);
    setLoading(false);
  }

  useEffect(() => {
    fetchLeaderboard(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  // Pódio: agrupa por rank e mostra os 3 primeiros ranks (com nomes juntinhos em caso de empate)
  const top3 = useMemo(() => {
    const byRank = new Map<number, Row[]>();
    rows.forEach((r) => {
      if (!byRank.has(r.rank)) byRank.set(r.rank, []);
      byRank.get(r.rank)!.push(r);
    });
    return [1, 2, 3].map((rk) => {
      const group = byRank.get(rk) ?? [];
      if (group.length === 0) return { name: "—", points: 0 };
      return {
        name: group.map((g) => g.player_name).join(", "),
        points: group[0].total_points,
      };
    });
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
          <Podium top3={top3} />

          <Card className="p-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Jogador</TableHead>
                  <TableHead className="text-right">Pontos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                      Carregando…
                    </TableCell>
                  </TableRow>
                )}

                {!loading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                      Sem partidas neste período.
                    </TableCell>
                  </TableRow>
                )}

                {!loading &&
                  rows.map((r) => (
                    <TableRow key={r.player_id}>
                      {/* mostra a posição calculada (empates na mesma posição) */}
                      <TableCell className="w-10">{r.rank}</TableCell>
                      <TableCell className="font-medium">{r.player_name}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{r.total_points}</Badge>
                      </TableCell>
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
