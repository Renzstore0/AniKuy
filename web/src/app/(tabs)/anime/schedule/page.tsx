"use client";

import TopBar from "@/components/TopBar";
import { apiGet } from "@/lib/api";
import { pickArray, pickString } from "@/lib/normalize";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function AnimeSchedulePage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const raw = await apiGet<any>(`/v1/anime/schedule`);
      const arr = pickArray(raw);
      setRows(arr);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <TopBar title="Anime • Jadwal Rilis" backHref="/explore" />
      {loading ? <div className="text-sm text-white/60">Loading...</div> : null}

      <div className="grid gap-3">
        {rows.map((r, idx) => {
          const title = pickString(r, ["day", "title", "name"], `Item ${idx + 1}`);
          const items = pickArray(r?.items || r?.list || r?.data);
          return (
            <div key={idx} className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
              <div className="text-sm font-semibold">{title}</div>
              <div className="mt-3 grid gap-2">
                {items.slice(0, 10).map((a: any, i: number) => {
                  const t = pickString(a, ["title", "name"], "Untitled");
                  const slug = pickString(a, ["slug", "id"], "");
                  return (
                    <Link key={i} href={slug ? `/anime/${slug}` : "#"} className="rounded-2xl bg-white/5 px-3 py-2 text-sm hover:bg-white/10">
                      {t}
                    </Link>
                  );
                })}
                {items.length > 10 ? (
                  <div className="text-xs text-white/55">+{items.length - 10} lainnya</div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
