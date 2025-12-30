"use client";

import TopBar from "@/components/TopBar";
import CardGrid, { GridItem } from "@/components/CardGrid";
import { apiGet } from "@/lib/api";
import { pickArray, pickString } from "@/lib/normalize";
import { useEffect, useState } from "react";
import { useInfiniteScroll } from "@/lib/useInfiniteScroll";

export default function CompletedAnimePage() {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<GridItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { ref, hit } = useInfiniteScroll();

  async function load(p: number) {
    setLoading(true);
    const raw = await apiGet<any>(`/v1/anime/completed?page=${p}`);
    const arr = pickArray(raw);
    const mapped = arr.map((a: any) => ({
      title: pickString(a, ["title", "name"], "Untitled"),
      href: `/anime/${pickString(a, ["slug", "id", "linkSlug"], "")}`,
      poster: pickString(a, ["poster", "image", "thumbnail", "cover"], "")
    })).filter((x: any) => x.href !== "/anime/");
    setItems((prev) => (p === 1 ? mapped : [...prev, ...mapped]));
    setLoading(false);
  }

  useEffect(() => { load(1); }, []);
  useEffect(() => {
    if (hit === 0) return;
    const next = page + 1;
    setPage(next);
    load(next);
  }, [hit]);

  return (
    <div>
      <TopBar title="Anime • Selesai Ditayangkan" backHref="/explore" />
      <CardGrid items={items} />
      <div ref={ref} className="h-10" />
      {loading ? <div className="py-3 text-center text-sm text-white/60">Loading...</div> : null}
    </div>
  );
}
