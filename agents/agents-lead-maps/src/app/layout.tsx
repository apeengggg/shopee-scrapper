import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lead Maps Agent",
  description: "Find businesses without websites from OpenStreetMap data."
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
