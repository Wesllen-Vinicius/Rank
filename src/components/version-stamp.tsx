"use client";

export default function VersionStamp() {
  const sha = process.env.NEXT_PUBLIC_COMMIT_SHORT || "dev";
  const ref = process.env.NEXT_PUBLIC_COMMIT_REF || "";
  const builtISO = process.env.NEXT_PUBLIC_BUILD_TIME || "";
  const built =
    builtISO
      ? new Date(builtISO).toLocaleString("pt-BR", { hour12: false })
      : "";

  return (
    <div
      className="
        text-[10px] md:text-xs text-muted-foreground
        inline-flex items-center gap-1 select-all
      "
      title={`SHA: ${process.env.NEXT_PUBLIC_COMMIT_SHA || "dev"} | ${built}`}
    >
      <span>v{sha}</span>
      {ref && <span>· {ref}</span>}
      {built && <span>· {built}</span>}
    </div>
  );
}
