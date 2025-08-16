// src/components/version-stamp.tsx  (ou o caminho onde está o seu VersionStamp)
// ⚠️ Remova "use client" — este componente deve ser Server Component.

export default function VersionStamp() {
  // usa as vars de build da Vercel; cai para as públicas (dev/local)
  const shaFull =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_COMMIT_SHA ||
    "";

  const shaShort =
    (shaFull && shaFull.slice(0, 7)) ||
    process.env.NEXT_PUBLIC_COMMIT_SHORT ||
    "1.0.0";

  const ref =
    process.env.VERCEL_GIT_COMMIT_REF ||
    process.env.NEXT_PUBLIC_COMMIT_REF ||
    "";

  const builtISO = process.env.NEXT_PUBLIC_BUILD_TIME || "";
  const built = builtISO
    ? new Date(builtISO).toLocaleString("pt-BR", { hour12: false })
    : "";

  return (
    <div
      className="
        text-[10px] md:text-xs text-muted-foreground
        inline-flex items-center gap-1 select-all
      "
      title={`SHA: ${shaFull || "dev"}${built ? ` | ${built}` : ""}`}
    >
      <span>v{shaShort}</span>
      {ref && <span>· {ref}</span>}
      {built && <span>· {built}</span>}
    </div>
  );
}
