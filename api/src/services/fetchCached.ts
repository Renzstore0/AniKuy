import { CacheEntry } from "../cache/CacheEntry.js";

type FetchCachedOpts = {
  ttlSeconds: number;
  headers?: Record<string, string>;
};

/**
 * Cache JSON or text. Kalau upstream bukan JSON, kita simpan sebagai string.
 */
export async function fetchCached(url: string, opts: FetchCachedOpts) {
  const key = url;

  const hit = await CacheEntry.findOne({ key }).lean();
  if (hit && hit.expireAt > new Date()) return hit.value;

  const res = await fetch(url, { headers: opts.headers });
  if (!res.ok) throw new Error(`Upstream error ${res.status} for ${url}`);

  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : await res.text();

  await CacheEntry.updateOne(
    { key },
    {
      $set: {
        key,
        value: data,
        expireAt: new Date(Date.now() + opts.ttlSeconds * 1000),
      },
    },
    { upsert: true }
  );

  return data;
}
