"use client";

import TopBar from "@/components/TopBar";
import SearchBar from "@/components/SearchBar";

export default function DramaSearchLanding() {
  return (
    <div>
      <TopBar title="Cari Drama" backHref="/explore" />
      <SearchBar placeholder="Contoh: Patuhlah" onSubmitPath={(q) => `/drama/search/results?q=${encodeURIComponent(q)}`} />
      <div className="rounded-3xl bg-white/5 p-4 text-sm text-white/70 ring-1 ring-white/10">
        Ketik judul drama lalu tekan Cari.
      </div>
    </div>
  );
}
