import "./globals.css";
import type { Metadata } from "next";
import Navbar from "@/components/navbar";
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
        <ThemeProvider>
          <Navbar />
          <main className="container mx-auto px-4 py-6">{children}</main>
          <Toaster richColors closeButton />
          <footer className="container mx-auto px-4 py-10 text-xs text-muted-foreground">
            Feito com Next.js, shadcn/ui e Supabase.
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
