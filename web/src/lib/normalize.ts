/**
 * API pihak ketiga kadang beda-beda bentuk.
 * Kita normalisasi minimal: ambil array item dari key umum.
 */
export function pickArray(obj: any): any[] {
  if (!obj) return [];
  if (Array.isArray(obj)) return obj;
  for (const k of ["data", "results", "items", "list", "animeList"]) {
    if (Array.isArray(obj?.[k])) return obj[k];
  }
  return [];
}

export function pickString(o: any, keys: string[], fallback = ""): string {
  for (const k of keys) {
    const v = o?.[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return fallback;
}
