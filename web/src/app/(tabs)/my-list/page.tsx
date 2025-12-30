"use client";

import TopBar from "@/components/TopBar";
import { apiGet, apiPost, getUserId } from "@/lib/api";
import { useEffect, useState } from "react";
import Link from "next/link";

type Item = { _id: string; type: "anime" | "drama"; key: string; title?: string; poster?: string };

export default function MyListPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const uid = getUserId();
    const r = await apiGet<{ items: Item[] }>(`/v1/my-list`, {
      headers: { "x-user-id": uid }
    });
    setItems(r.items || []);
    setLoading(false);
  }

  async function remove(it: Item) {
    const uid = getUserId();
    await apiPost(`/v1/my-list/remove`, { type: it.type, key: it.key }, { headers: { "x-user-id": uid } });
    await load();
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <TopBar title="My List" />
      {loading ? <div className="text-sm text-white/60">Loading...</div> : null}

      <div className="grid gap-3">
        {items.map((it) => {
          const href = it.type === "anime" ? `/anime/${it.key}` : `/drama/${it.key}`;
          return (
            <div key={it._id} className="flex gap-3 rounded-3xl bg-white/5 p-3 ring-1 ring-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.poster || "/placeholder.png"} alt={it.title || it.key} className="h-24 w-16 rounded-xl object-cover bg-white/5" />
              <div className="flex-1">
                <Link href={href} className="line-clamp-2 text-sm font-medium">{it.title || it.key}</Link>
                <div className="mt-1 text-xs text-white/60">{it.type.toUpperCase()}</div>
                <button
                  onClick={() => remove(it)}
                  className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-xs ring-1 ring-white/10 hover:bg-white/15"
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}

        {!loading && items.length === 0 ? (
          <div className="rounded-3xl bg-white/5 p-4 text-sm text-white/70 ring-1 ring-white/10">
            Belum ada list. Tambahin dari halaman detail.
          </div>
        ) : null}
      </div>
    </div>
  );
}
