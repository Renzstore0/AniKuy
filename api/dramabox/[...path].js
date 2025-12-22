// /api/dramabox/[...path].js
export default async function handler(req, res) {
  const API_BASE = "https://dramabox.sansekai.my.id";

  // path yang diminta: /api/dramabox/<...path>
  const pathParts = Array.isArray(req.query.path) ? req.query.path : [req.query.path].filter(Boolean);

  // query params (selain "path")
  const { path, ...restQuery } = req.query;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(restQuery)) {
    if (Array.isArray(v)) v.forEach((x) => qs.append(k, x));
    else if (v !== undefined) qs.append(k, v);
  }

  const targetUrl =
    API_BASE.replace(/\/+$/, "") +
    "/" +
    pathParts.map((s) => String(s).replace(/^\/+|\/+$/g, "")).join("/") +
    (qs.toString() ? `?${qs.toString()}` : "");

  try {
    const upstream = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": req.headers["user-agent"] || "vercel-proxy",
      },
    });

    const bodyText = await upstream.text();

    // balikin status + body apa adanya
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.send(bodyText);
  } catch (err) {
    return res.status(500).json({ error: true, message: "Proxy gagal", detail: String(err?.message || err) });
  }
}
