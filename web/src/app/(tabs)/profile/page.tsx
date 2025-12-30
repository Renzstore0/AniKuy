"use client";

import TopBar from "@/components/TopBar";
import { getUserId } from "@/lib/api";
import { useEffect, useState } from "react";

export default function ProfilePage() {
  const [uid, setUid] = useState("guest");
  useEffect(() => setUid(getUserId()), []);

  return (
    <div>
      <TopBar title="Profile" />
      <div className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
        <div className="text-sm text-white/60">User ID</div>
        <div className="mt-2 break-all rounded-2xl bg-black/30 p-3 text-sm ring-1 ring-white/10">{uid}</div>
        <div className="mt-3 text-xs text-white/55">
          Untuk versi awal, login belum dibuat. My List pakai userId lokal.
        </div>
      </div>
    </div>
  );
}
