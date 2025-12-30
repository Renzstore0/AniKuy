import Link from "next/link";

export type GridItem = {
  title: string;
  href: string;
  poster?: string;
  subtitle?: string;
};

export default function CardGrid({ items }: { items: GridItem[] }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          className="rounded-2xl bg-white/5 p-2 transition hover:bg-white/10"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={it.poster || "/placeholder.png"}
            alt={it.title}
            className="aspect-[2/3] w-full rounded-xl object-cover bg-white/5"
          />
          <div className="mt-2 line-clamp-2 text-xs text-white/85">{it.title}</div>
          {it.subtitle ? (
            <div className="mt-1 line-clamp-1 text-[11px] text-white/55">{it.subtitle}</div>
          ) : null}
        </Link>
      ))}
    </div>
  );
}
