"use client";

import TopBar from "@/components/TopBar";
import { apiGet } from "@/lib/api";
import { pickArray, pickString } from "@/lib/normalize";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function AnimeGenresPage() {
  const [genres, setGenres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const raw = await apiGet<any>(`/v1/anime/genre`);
      setGenres(pickArray(raw));
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <TopBar title="Anime • List Genre" backHref="/explore" />
      {loading ? <div className="text-sm text-white/60">Loading...</div> : null}

      <div className="grid grid-cols-2 gap-2">
        {genres.map((g, i) => {
          const name = pickString(g, ["name", "title"], "Genre");
          const slug = pickString(g, ["slug", "id", "key"], "");
          return (
            <Link
              key={i}
              href={slug ? `/anime/genre/${slug}` : "#"}
              className="rounded-2xl bg-white/10 px-3 py-3 text-sm ring-1 ring-white/10 hover:bg-white/15"
            >
              {name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
