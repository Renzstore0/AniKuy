"use client";

import TopBar from "@/components/TopBar";
import { apiGet } from "@/lib/api";
import { useEffect, useState } from "react";

export default function DramaWatchPage({ params }: { params: { bookId: string; episode: string } }) {
  const { bookId, episode } = params;
  const [stream, setStream] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const raw = await apiGet<any>(`/v1/drama/stream?bookId=${bookId}&episode=${episode}`);
      setStream(raw);
      setLoading(false);
    })();
  }, [bookId, episode]);

  const url =
    typeof stream === "string"
      ? stream
      : stream?.url || stream?.data?.url || stream?.playUrl || stream?.data?.playUrl || "";

  return (
    <div>
      <TopBar title={`Watch • EP ${episode}`} backHref={`/drama/${bookId}`} />
      {loading ? <div className="text-sm text-white/60">Loading...</div> : null}

      <div className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
        {url ? (
          <video
            src={url}
            controls
            className="w-full rounded-2xl bg-black"
          />
        ) : (
          <div className="text-sm text-white/60">
            Stream URL belum ketemu dari respon. Cek JSON dari endpoint stream lalu map field-nya.
          </div>
        )}
        <div className="mt-3 text-xs text-white/55">
          Kalau video tidak bisa diputar, biasanya link stream bukan direct MP4/HLS atau butuh header khusus.
        </div>
      </div>
    </div>
  );
}
