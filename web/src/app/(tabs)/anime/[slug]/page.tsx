"use client";

import TopBar from "@/components/TopBar";
import { apiGet, apiPost, getUserId } from "@/lib/api";
import { pickString } from "@/lib/normalize";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function AnimeDetailPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const raw = await apiGet<any>(`/v1/anime/anime/${slug}`);
      setData(raw);
      setLoading(false);
    })();
  }, [slug]);

  async function addToList() {
    if (!data) return;
    setSaving(true);
    const uid = getUserId();
    await apiPost(
      `/v1/my-list/add`,
      {
        type: "anime",
        key: slug,
        title: pickString(data, ["title", "name"], slug),
        poster: pickString(data, ["poster", "image", "thumbnail", "cover"], "")
      },
      { headers: { "x-user-id": uid } }
    );
    setSaving(false);
  }

  const title = pickString(data, ["title", "name"], slug);
  const poster = pickString(data, ["poster", "image", "thumbnail", "cover"], "");

  const episodes = Array.isArray(data?.episodes) ? data.episodes : (Array.isArray(data?.data?.episodes) ? data.data.episodes : []);

  return (
    <div>
      <TopBar title="Detail Anime" backHref="/anime/ongoing" />
      {loading ? <div className="text-sm text-white/60">Loading...</div> : null}

      <div className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
        <div className="flex gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={poster || "/placeholder.png"} alt={title} className="h-28 w-20 rounded-2xl object-cover bg-white/5" />
          <div className="flex-1">
            <div className="text-base font-semibold">{title}</div>
            <div className="mt-1 text-xs text-white/60">{slug}</div>
            <button
              onClick={addToList}
              disabled={saving}
              className="mt-3 rounded-2xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/10 hover:bg-white/15 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Add to My List"}
            </button>
          </div>
        </div>

        {pickString(data, ["synopsis", "description"], "") ? (
          <div className="mt-4 text-sm text-white/75">
            {pickString(data, ["synopsis", "description"], "")}
          </div>
        ) : null}
      </div>

      <div className="mt-4 rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
        <div className="mb-2 text-sm font-semibold">Episode</div>
        {episodes?.length ? (
          <div className="grid gap-2">
            {episodes.map((e: any, i: number) => {
              const epTitle = pickString(e, ["title", "name"], `Episode ${i + 1}`);
              const href = pickString(e, ["url", "link"], "");
              return (
                <a
                  key={i}
                  href={href || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                >
                  {epTitle}
                </a>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-white/60">
            Episode list belum dinormalisasi (tergantung respon API). Kamu bisa mapping sesuai field yang ada.
          </div>
        )}

        <div className="mt-3 text-xs text-white/55">
          Note: link episode di atas buka tab baru. Kalau kamu punya endpoint stream sendiri nanti, tinggal ganti href.
        </div>
      </div>

      <div className="mt-4">
        <Link href="/my-list" className="text-sm text-white/70 underline">Lihat My List</Link>
      </div>
    </div>
  );
}
