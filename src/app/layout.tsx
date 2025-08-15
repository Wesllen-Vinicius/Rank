import "./globals.css";
import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import MobileNav from "@/components/mobile-nav";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Placar de Amigos",
  description: "Ranking e partidas dos seus jogos",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        {/* Tema (dark/light) */}
        <ThemeProvider /* se seu ThemeProvider aceitar, pode setar:
                          attribute="class" defaultTheme="system" enableSystem
                          disableTransitionOnChange */
        >
          {/* Navbar de topo (desktop/tablet) */}
          <Navbar />

          {/* Conteúdo com “respiro” para o bottom-nav no mobile */}
          <main
            className="
              container mx-auto max-w-5xl
              px-3 md:px-4 pt-6
              pb-24 md:pb-8
              supports-[padding:env(safe-area-inset-bottom)]:pb-[calc(env(safe-area-inset-bottom)+6rem)]
            "
          >
            {children}
          </main>

          {/* Rodapé (fica acima do bottom-nav graças ao padding do <main>) */}
          <footer className="container mx-auto max-w-5xl px-3 md:px-4 py-10 text-xs text-muted-foreground">
            Feito com Next.js, shadcn/ui e Supabase.
          </footer>

          {/* Toasts (no topo, não colidem com bottom-nav) */}
          <Toaster richColors closeButton position="top-center" />

          {/* Navegação fixa para mobile */}
          <MobileNav />
        </ThemeProvider>
      </body>
    </html>
  );
}
