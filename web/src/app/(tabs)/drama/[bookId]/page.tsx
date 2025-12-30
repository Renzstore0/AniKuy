"use client";

import TopBar from "@/components/TopBar";
import { apiGet, apiPost, getUserId } from "@/lib/api";
import { pickArray, pickString } from "@/lib/normalize";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function DramaDetailPage({ params }: { params: { bookId: string } }) {
  const bookId = params.bookId;
  const [data, setData] = useState<any>(null);
  const [eps, setEps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const raw = await apiGet<any>(`/v1/drama/detail/${bookId}`);
      setData(raw);
      const arr = pickArray(raw?.episodes || raw?.data?.episodes || raw?.chapterList || raw?.data?.chapterList || raw);
      setEps(arr);
      setLoading(false);
    })();
  }, [bookId]);

  const title = pickString(data, ["bookName", "title", "name"], bookId);
  const poster = pickString(data, ["cover", "poster", "img"], "");

  async function addToList() {
    setSaving(true);
    const uid = getUserId();
    await apiPost(
      `/v1/my-list/add`,
      { type: "drama", key: bookId, title, poster },
      { headers: { "x-user-id": uid } }
    );
    setSaving(false);
  }

  return (
    <div>
      <TopBar title="Detail Drama" backHref="/drama/home" />
      {loading ? <div className="text-sm text-white/60">Loading...</div> : null}

      <div className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
        <div className="flex gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={poster || "/placeholder.png"} alt={title} className="h-28 w-20 rounded-2xl object-cover bg-white/5" />
          <div className="flex-1">
            <div className="text-base font-semibold">{title}</div>
            <div className="mt-1 text-xs text-white/60">{bookId}</div>
            <button
              onClick={addToList}
              disabled={saving}
              className="mt-3 rounded-2xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/10 hover:bg-white/15 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Add to My List"}
            </button>
          </div>
        </div>

        {pickString(data, ["desc", "description", "intro"], "") ? (
          <div className="mt-4 text-sm text-white/75">
            {pickString(data, ["desc", "description", "intro"], "")}
          </div>
        ) : null}
      </div>

      <div className="mt-4 rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
        <div className="mb-2 text-sm font-semibold">Episode</div>
        {eps.length ? (
          <div className="grid grid-cols-2 gap-2">
            {eps.map((e, idx) => {
              const epNum = Number(pickString(e, ["episode", "ep", "index"], String(idx + 1))) || (idx + 1);
              return (
                <Link
                  key={idx}
                  href={`/drama/watch/${bookId}/${epNum}`}
                  className="rounded-2xl bg-white/10 px-3 py-2 text-sm ring-1 ring-white/10 hover:bg-white/15"
                >
                  Episode {epNum}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-white/60">
            Episode list belum kebaca dari respon. Cek struktur JSON dan map field-nya.
          </div>
        )}
      </div>
    </div>
  );
}
