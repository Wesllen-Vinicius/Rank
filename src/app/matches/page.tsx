"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { fmtDate } from "@/lib/utils";
import { toast } from "sonner";

type Player = { id: string; name: string };
type Game = { id: string; name: string };
type Line = { player_id: string; points: number };

export default function MatchesPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [gameId, setGameId] = useState<string>("");
  const [playedAt, setPlayedAt] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [lines, setLines] = useState<Line[]>([]);
  const [recent, setRecent] = useState<any[]>([]);

  const total = useMemo(() => lines.reduce((s, l) => s + (Number(l.points) || 0), 0), [lines]);

  useEffect(() => {
    (async () => {
      const [p, g] = await Promise.all([
        supabase.from("players").select("*").order("name"),
        supabase.from("games").select("*").order("name"),
      ]);
      setPlayers((p.data as Player[]) ?? []);
      setGames((g.data as Game[]) ?? []);
      setLines([]);

      const last = await supabase
        .from("matches")
        .select(`id, played_at, games(name), match_scores(points, players(name))`)
        .order("played_at", { ascending: false })
        .limit(5);

      setRecent((last.data as any[]) ?? []);
    })();
  }, []);

  function addLine() {
    setLines((old) => [...old, { player_id: players[0]?.id ?? "", points: 0 }]);
  }
  function setLine(idx: number, patch: Partial<Line>) {
    setLines((old) => old.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  async function save() {
    if (!gameId) return toast.warning("Selecione um jogo.");
    if (lines.length === 0) return toast.warning("Adicione pelo menos um jogador e pontos.");

    const when = playedAt ? new Date(playedAt) : new Date();
    const { data: match, error } = await supabase
      .from("matches")
      .insert({ game_id: gameId, played_at: when, notes })
      .select()
      .single();
    if (error || !match) return toast.error("Erro ao salvar a partida.");

    const rows = lines
      .filter((l) => l.player_id && Number.isFinite(Number(l.points)))
      .map((l) => ({ match_id: match.id, player_id: l.player_id, points: Number(l.points) }));
    const { error: e2 } = await supabase.from("match_scores").insert(rows);
    if (e2) return toast.error("Erro ao salvar as pontuações.");

    toast.success("Partida salva!");
    setGameId(""); setPlayedAt(""); setNotes(""); setLines([]);

    const last = await supabase
      .from("matches")
      .select(`id, played_at, games(name), match_scores(points, players(name))`)
      .order("played_at", { ascending: false })
      .limit(5);
    setRecent((last.data as any[]) ?? []);
  }

  return (
    <div className="grid gap-6 md:grid-cols-5">
      <Card className="p-4 md:col-span-3 space-y-4">
        <h2 className="font-semibold text-lg">Registrar Partida</h2>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Jogo</Label>
            <Select value={gameId} onValueChange={setGameId}>
              <SelectTrigger><SelectValue placeholder="Selecione o jogo" /></SelectTrigger>
              <SelectContent>
                {games.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Data/Hora (opcional)</Label>
            <Input type="datetime-local" value={playedAt} onChange={(e) => setPlayedAt(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Pontuações</h3>
            <Button variant="secondary" size="sm" onClick={addLine}>+ Jogador</Button>
          </div>

          {lines.length === 0 && <div className="text-sm text-muted-foreground">Adicione ao menos um jogador.</div>}

          <div className="space-y-3">
            {lines.map((l, idx) => (
              <div key={idx} className="grid gap-2 md:grid-cols-3">
                <div>
                  <Label className="sr-only">Jogador</Label>
                  <Select value={l.player_id} onValueChange={(v) => setLine(idx, { player_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Jogador" /></SelectTrigger>
                    <SelectContent>
                      {players.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="sr-only">Pontos</Label>
                  <Input type="number" inputMode="numeric" placeholder="Pontos"
                    value={String(l.points)} onChange={(e) => setLine(idx, { points: Number(e.target.value) })}/>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => setLines((old) => old.filter((_, i) => i !== idx))}>
                    Remover
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="text-sm text-muted-foreground">
            Total informado: <b>{total}</b> pontos
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Observações (opcional)</Label>
          <Input placeholder="Ex.: melhor de 3, mesa azul…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="flex justify-end">
          <Button onClick={save}>Salvar Partida</Button>
        </div>
      </Card>

      <Card className="p-4 md:col-span-2">
        <h2 className="font-semibold mb-3">Últimas partidas</h2>
        <ul className="space-y-3">
          {recent.map((m) => (
            <li key={m.id} className="border rounded-md p-3">
              <div className="text-sm font-medium">
                {m.games?.name ?? "—"} <span className="text-xs text-muted-foreground">({fmtDate(m.played_at)})</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {m.match_scores?.map((s: any) => `${s.players?.name}: ${s.points}`).join(" • ")}
              </div>
            </li>
          ))}
          {recent.length === 0 && <div className="text-sm text-muted-foreground">Sem partidas ainda.</div>}
        </ul>
      </Card>
    </div>
  );
}
