import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tarefas e Financeiro B&D | Douglas & Bruna",
  description:
    "Um espaço compartilhado para Douglas e Bruna organizarem tarefas da casa e finanças.",
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
