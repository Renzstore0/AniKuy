"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SearchBar({
  placeholder,
  onSubmitPath
}: {
  placeholder: string;
  onSubmitPath: (q: string) => string;
}) {
  const r = useRouter();
  const [q, setQ] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const v = q.trim();
        if (!v) return;
        r.push(onSubmitPath(v));
      }}
      className="mb-4"
    >
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-2xl bg-white/5 px-4 py-3 text-sm outline-none ring-1 ring-white/10 focus:ring-white/20"
        />
        <button
          type="submit"
          className="rounded-2xl bg-white/10 px-4 py-3 text-sm ring-1 ring-white/10 hover:bg-white/15"
        >
          Cari
        </button>
      </div>
    </form>
  );
}
