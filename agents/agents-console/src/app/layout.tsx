import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agents Console",
  description: "Manage local agents and published landing-page previews."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
