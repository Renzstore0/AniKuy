// /api/dramabox/[...path].js
export default async function handler(req, res) {
  const API_BASE = "https://dramabox.sansekai.my.id";

  const pathParts = Array.isArray(req.query.path)
    ? req.query.path
    : [req.query.path].filter(Boolean);

  // bikin URL pakai WHATWG URL
  const target = new URL(API_BASE.replace(/\/+$/, "") + "/");
  target.pathname = pathParts
    .map((s) => String(s).replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");

  // query params (kecuali "path")
  for (const [k, v] of Object.entries(req.query || {})) {
    if (k === "path") continue;
    if (Array.isArray(v)) v.forEach((x) => target.searchParams.append(k, x));
    else if (v !== undefined) target.searchParams.append(k, v);
  }

  try {
    const upstream = await fetch(target.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": req.headers["user-agent"] || "vercel-proxy",
      },
    });

    const text = await upstream.text();

    res.status(upstream.status);
    res.setHeader(
      "Content-Type",
      upstream.headers.get("content-type") || "application/json; charset=utf-8"
    );
    res.setHeader("Cache-Control", "no-store");
    return res.send(text);
  } catch (err) {
    return res
      .status(500)
      .json({ error: true, message: "Proxy gagal", detail: String(err?.message || err) });
  }
}
