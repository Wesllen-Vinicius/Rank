import { Card } from "@/components/ui/card";
import { Trophy } from "lucide-react";

type PodiumProps = {
  top3: { name: string; points: number }[];
};

export default function Podium({ top3 }: PodiumProps) {
  const labels = ["1º Lugar", "2º Lugar", "3º Lugar"];
  const trophyTone = ["text-yellow-500", "text-slate-400", "text-amber-700"];

  return (
    <div className="grid grid-cols-3 gap-3">
      {[0, 1, 2].map((i) => (
        <Card key={i} className="p-4 flex flex-col items-center justify-center text-center">
          <Trophy className={`h-10 w-10 ${trophyTone[i]} mb-2`} />
          <div className="font-semibold text-sm">{labels[i]}</div>
          <div className="text-base">{top3[i]?.name ?? "—"}</div>
          <div className="text-xs text-muted-foreground">{top3[i]?.points ?? 0} pts</div>
        </Card>
      ))}
    </div>
  );
}
