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
  // Mostra o hash/versão de build (definido no next.config.*)
  const version = process.env.NEXT_PUBLIC_APP_VERSION || "dev";
  const year = new Date().getFullYear();

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <ThemeProvider>
          <Navbar />

          <main
            className="
              container mx-auto max-w-5xl
              px-3 md:px-4 pt-6
              pb-24 md:pb-8
              supports-[padding:env(safe-area-inset-bottom)]:pb-[calc(env(safe-area-inset-bottom)+4.5rem)]
            "
          >
            {children}
          </main>

          <footer className="border-t">
            <div className="container mx-auto max-w-5xl px-3 md:px-4 py-6 text-xs text-muted-foreground flex items-center justify-between gap-3">
              <span>
                © {year} • Feito com Next.js, shadcn/ui e Supabase.
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="hidden sm:inline">versão</span>
                <code className="rounded bg-muted px-1.5 py-0.5">
                  {version}
                </code>
              </span>
            </div>
          </footer>

          <Toaster richColors closeButton position="top-center" />
          {/* Barra inferior fixa (mobile) */}
          <MobileTabs />
        </ThemeProvider>
      </body>
    </html>
  );
}
