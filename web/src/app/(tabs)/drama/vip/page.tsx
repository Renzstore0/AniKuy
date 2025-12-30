"use client";

import TopBar from "@/components/TopBar";
import CardGrid, { GridItem } from "@/components/CardGrid";
import { apiGet } from "@/lib/api";
import { pickArray, pickString } from "@/lib/normalize";
import { useEffect, useState } from "react";

export default function DramaVipPage() {
  const [items, setItems] = useState<GridItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const raw = await apiGet<any>(`/v1/drama/vip`);
      const arr = pickArray(raw);
      const mapped = arr.map((d: any) => ({
        title: pickString(d, ["bookName", "title", "name"], "Untitled"),
        href: `/drama/${pickString(d, ["bookId", "id"], "")}`,
        poster: pickString(d, ["cover", "poster", "img"], "")
      })).filter((x: any) => x.href !== "/drama/");
      setItems(mapped);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <TopBar title="Drama • VIP" backHref="/explore" />
      {loading ? <div className="text-sm text-white/60">Loading...</div> : null}
      <CardGrid items={items} />
    </div>
  );
}
