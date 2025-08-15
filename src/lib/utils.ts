import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/** Junta classes de forma segura (compatível com o que o shadcn espera) */
type ClassInput =
  | string
  | number
  | null
  | undefined
  | false
  | Record<string, boolean>
  | ClassInput[];

export function cn(...inputs: ClassInput[]): string {
  const out: string[] = [];

  const push = (i: ClassInput) => {
    if (!i) return;
    if (typeof i === "string" || typeof i === "number") {
      out.push(String(i));
      return;
    }
    if (Array.isArray(i)) {
      i.forEach(push);
      return;
    }
    if (typeof i === "object") {
      for (const [k, v] of Object.entries(i)) if (v) out.push(k);
    }
  };

  inputs.forEach(push);
  return out.join(" ");
}

/** Filtros do ranking */
export type RangeKey = "day" | "week" | "month" | "total";

export function rangeToDates(key: RangeKey) {
  const now = new Date();

  if (key === "total")
    return { from: undefined as Date | undefined, to: undefined as Date | undefined };

  if (key === "day") {
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { from, to: now };
  }

  if (key === "week") {
    const day = now.getDay(); // 0=domingo
    const diff = (day + 6) % 7; // segunda como início
    const from = new Date(now);
    from.setDate(now.getDate() - diff);
    from.setHours(0, 0, 0, 0);
    return { from, to: now };
  }

  // month
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from, to: now };
}

export function fmtDate(d?: Date | string | null) {
  if (!d) return "";
  return format(new Date(d), "dd 'de' MMM, HH:mm", { locale: ptBR });
}
