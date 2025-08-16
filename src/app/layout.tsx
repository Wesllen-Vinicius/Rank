import "./globals.css";
import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import MobileTabs from "@/components/mobile-tabs";

export const metadata: Metadata = {
  title: "Placar de Amigos",
  description: "Ranking e partidas dos seus jogos",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const version = process.env.NEXT_PUBLIC_APP_VERSION || "dev";
  const year = new Date().getFullYear();

  // altura da bottom bar (com safe-area) — usada no <main> e pela MobileTabs
  const bodyVars = {
    ["--btm-h"]: "calc(3.5rem + env(safe-area-inset-bottom))",
  } as React.CSSProperties & { ["--btm-h"]: string };

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground" style={bodyVars}>
        <ThemeProvider>
          <Navbar />

          {/* reserva espaço p/ a bottom bar no mobile */}
          <main className="container mx-auto max-w-5xl px-3 md:px-4 pt-6 pb-[calc(var(--btm-h)+0.5rem)] md:pb-8">
            {children}
          </main>

          {/* footer só no desktop/tablet */}
          <footer className="border-t hidden md:block">
            <div className="container mx-auto max-w-5xl px-3 md:px-4 py-6 text-xs text-muted-foreground flex items-center justify-between gap-3">
              <span>© {year} • Feito com Next.js, shadcn/ui e Supabase.</span>
              <span className="inline-flex items-center gap-1">
                <span className="hidden sm:inline">versão</span>
                <code className="rounded bg-muted px-1.5 py-0.5">{version}</code>
              </span>
            </div>
          </footer>

          <Toaster richColors closeButton position="top-center" />
          <MobileTabs />
        </ThemeProvider>
      </body>
    </html>
  );
}
