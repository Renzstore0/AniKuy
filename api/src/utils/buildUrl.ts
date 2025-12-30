export function buildUrl(base: string, path: string, query: any) {
  const u = new URL(`${base}/${path.replace(/^\/+/, "")}`);
  for (const [k, v] of Object.entries(query ?? {})) {
    u.searchParams.set(k, String(v));
  }
  return u.toString();
}
