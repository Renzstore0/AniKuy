import Link from "next/link";
import TopBar from "@/components/TopBar";

function Btn({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl bg-white/10 p-3 text-sm ring-1 ring-white/10 hover:bg-white/15"
    >
      {label}
    </Link>
  );
}

export default function ExplorePage() {
  return (
    <div>
      <TopBar title="Explore" />
      <div className="grid gap-6">
        <div className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
          <div className="text-sm text-white/70">Anime</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Btn href="/anime/schedule" label="Jadwal Rilis" />
            <Btn href="/anime/genres" label="List Genre" />
            <Btn href="/anime/ongoing" label="Sedang Tayang" />
            <Btn href="/anime/completed" label="Selesai Ditayangkan" />
          </div>
          <div className="mt-3 text-xs text-white/55">
            Tip: halaman Ongoing/Completed/Genre pakai infinite scroll.
          </div>
        </div>

        <div className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
          <div className="text-sm text-white/70">Short Drama</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Btn href="/drama/vip" label="VIP" />
            <Btn href="/drama/categories" label="List Genre" />
            <Btn href="/drama/recommend" label="Recommend" />
            <Btn href="/drama/home" label="Home" />
          </div>
        </div>

        <div className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
          <div className="text-sm text-white/70">Search</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Btn href="/anime/search" label="Cari Anime" />
            <Btn href="/drama/search" label="Cari Drama" />
          </div>
        </div>
      </div>
    </div>
  );
}
