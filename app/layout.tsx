import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VetKarjera – Veterinarijos darbo skelbimai",
  description: "Moderni platforma, sujungianti veterinarijos gydytojus ir klinikas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="lt">
      <body>{children}</body>
    </html>
  );
}
