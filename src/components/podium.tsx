import { Card } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

type PodiumItem = { name: string; points: number }; // points = vitórias
type PodiumProps = {
  top3: PodiumItem[];   // pode vir com 1, 2 ou 3 itens
  className?: string;
};

const label = (wins: number) =>
  wins > 0 ? `${wins} vitória${wins === 1 ? "" : "s"}` : "0 vitórias";

export default function Podium({ top3, className }: PodiumProps) {
  // esconde quem não tem vitória
  const items = (top3 ?? []).filter((i) => i && i.points > 0);

  const tones = ["text-yellow-500", "text-slate-400", "text-amber-700"];
  const cols =
    items.length === 1
      ? "grid-cols-1"
      : items.length === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3";

  return (
    <div className={cn("grid gap-3", cols, className)}>
      {items.map((item, i) => (
        <Card
          key={i}
          className="p-4 flex flex-col items-center justify-center text-center"
          aria-label={`${i + 1}º Lugar — ${item.name}`}
        >
          <Trophy className={cn("h-10 w-10 mb-2", tones[i])} aria-hidden />
          <div className="font-semibold text-sm">{i + 1}º Lugar</div>
          <div className="text-base max-w-[18rem] truncate" title={item.name}>
            {item.name}
          </div>
          <div className="text-xs text-muted-foreground">{label(item.points)}</div>
        </Card>
      ))}
    </div>
  );
}
