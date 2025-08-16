// src/components/share-podium.tsx
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type PodiumEntry = { name: string; points: number };

type NavShare = Navigator & { share?: (data: ShareData) => Promise<void> };
type NavClipboard = Navigator & { clipboard?: { writeText?: (t: string) => Promise<void> } };

export default function SharePodium({
  top3, title, subtitle,
}: { top3: PodiumEntry[]; title: string; subtitle: string }) {
  const [copying, setCopying] = useState(false);

  const { imagePath, shareUrl } = useMemo(() => {
    const params = new URLSearchParams({
      title,
      subtitle,
      t1: top3[0]?.name ?? "—",
      p1: String(top3[0]?.points ?? 0),
      t2: top3[1]?.name ?? "—",
      p2: String(top3[1]?.points ?? 0),
      t3: top3[2]?.name ?? "—",
      p3: String(top3[2]?.points ?? 0),
    }).toString();

    const path = `/api/og/podium?${params}`; // relativo (aceito pelo <Image />)
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const absolute = origin ? `${origin}${path}` : path; // para compartilhar
    return { imagePath: path, shareUrl: absolute };
  }, [top3, title, subtitle]);

  const nav = (typeof navigator !== "undefined" ? navigator : undefined) as NavShare & NavClipboard | undefined;
  const canNativeShare = !!nav?.share;
  const canClipboard = typeof nav?.clipboard?.writeText === "function";

  async function share() {
    try {
      if (canNativeShare) {
        await nav!.share({ title, text: subtitle, url: shareUrl });
        return;
      }
      if (canClipboard) {
        setCopying(true);
        await nav!.clipboard!.writeText!(shareUrl);
        setCopying(false);
        toast.success("Link copiado!");
        return;
      }
      window.open(shareUrl, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Não foi possível compartilhar.");
      setCopying(false);
    }
  }

  return (
    <Card className="p-3 md:p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium">Compartilhar pódio</div>
        <div className="flex gap-2">
          <Button size="sm" onClick={share} disabled={copying}>
            {canNativeShare ? "Compartilhar" : copying ? "Copiando…" : "Copiar link"}
          </Button>
          <a href={shareUrl} target="_blank" rel="noreferrer">
            <Button size="sm" variant="outline">Abrir imagem</Button>
          </a>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input readOnly value={shareUrl} aria-label="URL do pódio" />
        <a className="sm:self-start" href={shareUrl} download="podio.png" target="_blank" rel="noreferrer">
          <Button className="w-full sm:w-auto" variant="secondary">Baixar PNG</Button>
        </a>
      </div>

      <div className="border rounded-md overflow-hidden">
        <Image
          src={imagePath}        // relativo => não precisa configurar domínio
          alt="Prévia do pódio"
          width={1200}
          height={630}
          className="w-full h-auto"
          priority
        />
      </div>
    </Card>
  );
}
