import Link from "next/link";
import Section from "@/components/Section";

export default function HomePage() {
  return (
    <div>
      <div className="mb-4">
        <div className="text-2xl font-semibold">AniKuy</div>
        <div className="text-sm text-white/60">Streaming Anime & Short Drama</div>
      </div>

      <div className="grid gap-3">
        <div className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
          <div className="text-sm text-white/70">Anime</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Link href="/anime/ongoing" className="rounded-2xl bg-white/10 p-3 text-sm hover:bg-white/15">Sedang Tayang</Link>
            <Link href="/anime/completed" className="rounded-2xl bg-white/10 p-3 text-sm hover:bg-white/15">Selesai Ditayangkan</Link>
            <Link href="/anime/schedule" className="rounded-2xl bg-white/10 p-3 text-sm hover:bg-white/15">Jadwal Rilis</Link>
            <Link href="/anime/genres" className="rounded-2xl bg-white/10 p-3 text-sm hover:bg-white/15">List Genre</Link>
          </div>
        </div>

        <div className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
          <div className="text-sm text-white/70">Short Drama</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Link href="/drama/recommend" className="rounded-2xl bg-white/10 p-3 text-sm hover:bg-white/15">Recommend</Link>
            <Link href="/drama/home" className="rounded-2xl bg-white/10 p-3 text-sm hover:bg-white/15">Home</Link>
            <Link href="/drama/vip" className="rounded-2xl bg-white/10 p-3 text-sm hover:bg-white/15">VIP</Link>
            <Link href="/drama/categories" className="rounded-2xl bg-white/10 p-3 text-sm hover:bg-white/15">List Genre</Link>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl bg-gradient-to-b from-white/10 to-white/5 p-4 ring-1 ring-white/10">
        <Section title="Quick Search" />
        <div className="grid grid-cols-2 gap-2">
          <Link href="/anime/search" className="rounded-2xl bg-white/10 p-3 text-sm hover:bg-white/15">Cari Anime</Link>
          <Link href="/drama/search" className="rounded-2xl bg-white/10 p-3 text-sm hover:bg-white/15">Cari Drama</Link>
        </div>
      </div>
    </div>
  );
}
