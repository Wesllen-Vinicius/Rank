// src/app/api/og/podium/route.tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";

function q(s: string | null, d = "") {
  return (s ?? d).slice(0, 60);
}
function qn(s: string | null, d = 0) {
  const n = Number(s ?? d);
  return Number.isFinite(n) ? n : d;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const title = q(searchParams.get("title"), "Pódio");
  const subtitle = q(searchParams.get("subtitle"), "");

  const t1 = q(searchParams.get("t1"), "—");
  const t2 = q(searchParams.get("t2"), "—");
  const t3 = q(searchParams.get("t3"), "—");
  const p1 = qn(searchParams.get("p1"), 0);
  const p2 = qn(searchParams.get("p2"), 0);
  const p3 = qn(searchParams.get("p3"), 0);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0b0b0b",
          color: "#fff",
          padding: 48,
          boxSizing: "border-box",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        {/* Cabeçalho */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 44, fontWeight: 800 }}>{title}</div>
          <div style={{ fontSize: 24, color: "#cbd5e1" }}>{subtitle}</div>
        </div>

        {/* Pódio */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 24,
            flex: 1,
          }}
        >
          {/* 2º */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: 340,
              gap: 12,
            }}
          >
            <div style={{ fontSize: 28, color: "#cbd5e1", textAlign: "center" }}>{t2}</div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 320,
                height: 180,
                background: "#1f2937",
                borderRadius: 16,
              }}
            >
              <span style={{ fontSize: 64, fontWeight: 800 }}>{p2}</span>
            </div>
            <div style={{ fontSize: 18, opacity: 0.8 }}>2º</div>
          </div>

          {/* 1º */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: 380,
              gap: 12,
            }}
          >
            <div style={{ fontSize: 32, fontWeight: 800, textAlign: "center" }}>{t1}</div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 360,
                height: 220,
                background: "#3b82f6",
                borderRadius: 16,
              }}
            >
              <span style={{ fontSize: 84, fontWeight: 900 }}>{p1}</span>
            </div>
            <div style={{ fontSize: 18, opacity: 0.9 }}>1º</div>
          </div>

          {/* 3º */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: 340,
              gap: 12,
            }}
          >
            <div style={{ fontSize: 28, color: "#cbd5e1", textAlign: "center" }}>{t3}</div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 320,
                height: 160,
                background: "#1f2937",
                borderRadius: 16,
              }}
            >
              <span style={{ fontSize: 64, fontWeight: 800 }}>{p3}</span>
            </div>
            <div style={{ fontSize: 18, opacity: 0.8 }}>3º</div>
          </div>
        </div>

        {/* Rodapé */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#94a3b8",
            fontSize: 18,
          }}
        >
          <span>Placar de Amigos</span>
          <span>{new Date().toLocaleDateString("pt-BR", { timeZone: "UTC" })}</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      emoji: "twemoji",
    }
  );
}
