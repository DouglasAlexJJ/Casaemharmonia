import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Casa em Harmonia | Finanças e rotina",
  description:
    "Um espaço compartilhado para Douglas e Bruna acompanharem as finanças e a rotina da casa.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
