"use client";

import TopBar from "@/components/TopBar";
import { apiGet } from "@/lib/api";
import { pickArray, pickString } from "@/lib/normalize";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function DramaCategoriesPage() {
  const [cats, setCats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const raw = await apiGet<any>(`/v1/drama/categories`);
      setCats(pickArray(raw));
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <TopBar title="Drama • List Genre" backHref="/explore" />
      {loading ? <div className="text-sm text-white/60">Loading...</div> : null}

      <div className="grid grid-cols-2 gap-2">
        {cats.map((c, i) => {
          const name = pickString(c, ["categoryName", "name", "title"], "Category");
          const id = pickString(c, ["categoryId", "id"], "");
          return (
            <Link
              key={i}
              href={id ? `/drama/category/${id}` : "#"}
              className="rounded-2xl bg-white/10 px-3 py-3 text-sm ring-1 ring-white/10 hover:bg-white/15"
            >
              {name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
