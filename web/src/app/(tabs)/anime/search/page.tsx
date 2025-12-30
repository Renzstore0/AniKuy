"use client";

import TopBar from "@/components/TopBar";
import SearchBar from "@/components/SearchBar";

export default function AnimeSearchLanding() {
  return (
    <div>
      <TopBar title="Cari Anime" backHref="/explore" />
      <SearchBar placeholder="Contoh: One Piece" onSubmitPath={(q) => `/anime/search/results?q=${encodeURIComponent(q)}`} />
      <div className="rounded-3xl bg-white/5 p-4 text-sm text-white/70 ring-1 ring-white/10">
        Ketik judul anime lalu tekan Cari.
      </div>
    </div>
  );
}
