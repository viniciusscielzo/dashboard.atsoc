import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atsoc Suporte | Gestão Executiva",
  description: "Gestão financeira, precificação e capacidade operacional da ATSOC.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
