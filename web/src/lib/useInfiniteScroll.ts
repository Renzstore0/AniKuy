"use client";

import { useEffect, useRef, useState } from "react";

export function useInfiniteScroll() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [hit, setHit] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) setHit((x) => x + 1);
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, hit };
}
