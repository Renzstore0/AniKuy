import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AniKuy",
  description: "Streaming Anime & Short Drama"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-zinc-950 text-white">{children}</body>
    </html>
  );
}
