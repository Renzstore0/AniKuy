import Link from "next/link";

export default function TopBar({ title, backHref }: { title: string; backHref?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h1 className="text-xl font-semibold">{title}</h1>
      {backHref ? (
        <Link href={backHref} className="text-sm text-white/70">
          Back
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
}
