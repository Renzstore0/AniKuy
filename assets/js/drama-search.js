(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const form = $("dramaSearchForm");
  const input = $("dramaSearchInput");
  const info = $("dramaSearchInfo");
  const grid = $("dramaSearchGrid");

  let t;

  // ====== DRAMA API (Anabot) + apikey ======
  const DRAMA_BASE = "https://anabot.my.id/api/search/drama/dramabox";
  const LS_DRAMA_KEY = "dramabox_apikey";

  const getDramaApiKey = () => {
    const k =
      (window.DRAMA_APIKEY && String(window.DRAMA_APIKEY).trim()) ||
      (localStorage.getItem(LS_DRAMA_KEY) || "").trim() ||
      "freeApikey";
    return k;
  };

  // ====== FETCH JSON (timeout + fallback cors proxy) ======
  const fetchJsonTry = async (url, timeoutMs = 15000) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        cache: "no-store",
        signal: ctrl.signal,
        headers: { Accept: "application/json,text/plain,*/*" },
      });

      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status} :: ${text.slice(0, 180)}`);

      try {
        return JSON.parse(text);
      } catch {
        throw new Error("Response bukan JSON");
      }
    } finally {
      clearTimeout(timer);
    }
  };

  const fetchJsonWithFallback = async (realUrl) => {
    const tries = [
      realUrl,
      `https://corsproxy.io/?${encodeURIComponent(realUrl)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(realUrl)}`,
      `https://cors.isomorphic-git.org/${realUrl}`,
    ];

    let lastErr = null;
    for (const u of tries) {
      try {
        return await fetchJsonTry(u);
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("FETCH_FAILED");
  };

  const apiGetDramaSafe = async (pathOrUrl) => {
    // kalau core.js punya apiGetDrama, coba pakai dulu
    if (typeof window.apiGetDrama === "function") {
      try {
        const r = await window.apiGetDrama(pathOrUrl);
        if (r) return r;
      } catch {}
    }

    // fallback mandiri (langsung ke anabot)
    const pth = String(pathOrUrl || "");
    let url = pth.startsWith("http")
      ? pth
      : pth.startsWith("/")
      ? DRAMA_BASE + pth
      : `${DRAMA_BASE}/${pth}`;

    const join = url.includes("?") ? "&" : "?";
    url = `${url}${join}apikey=${encodeURIComponent(getDramaApiKey())}`;
    return await fetchJsonWithFallback(url);
  };

  // ====== normalize hasil search ======
  const normalizeSearch = (payload) => {
    if (Array.isArray(payload)) return payload; // kalau ada proxy yang langsung array
    const r = payload?.data?.result;
    if (Array.isArray(r)) return r;
    return [];
  };

  const storeBook = (b) => {
    try {
      if (!b?.bookId) return;
      sessionStorage.setItem(`dramabox_book_${b.bookId}`, JSON.stringify(b));
    } catch {}
  };

  const setUrlQ = (q) => {
    const p = new URLSearchParams(location.search);
    q ? p.set("q", q) : p.delete("q");
    const s = p.toString();
    history.replaceState({}, "", s ? `${location.pathname}?${s}` : location.pathname);
  };

  const clearResult = () => {
    if (grid) grid.innerHTML = "";
    if (info) info.textContent = "";
  };

  async function performSearch(q) {
    if (!grid || !info) return;

    q = (q || "").trim();
    if (!q) {
      clearResult();
      setUrlQ("");
      return;
    }

    info.textContent = "Mencari...";
    grid.innerHTML = "";

    try {
      // ✅ pakai endpoint anabot: /search?keyword=<q>&apikey=...
      const payload = await apiGetDramaSafe(`/search?keyword=${encodeURIComponent(q)}`);
      const results = normalizeSearch(payload);

      info.textContent = `${results.length} hasil untuk "${q}"`;
      grid.innerHTML = "";

      results.forEach((b) => {
        const cover = b.coverWap || b.cover || "";
        const href = `/drama/detail?bookId=${encodeURIComponent(b.bookId || "")}&name=${encodeURIComponent(
          b.bookName || ""
        )}`;

        const tags = Array.isArray(b.tags) ? b.tags.slice(0, 3).join(", ") : "";

        grid.appendChild(
          createAnimeCard(
            { title: b.bookName || "-", poster: cover },
            {
              meta: tags,
              badgeBottom: b.chapterCount ? `Eps ${b.chapterCount}` : "",
              href,
              onClick: () => storeBook(b),
            }
          )
        );
      });

      setUrlQ(q);
    } catch (e) {
      info.textContent = "Gagal memuat data.";
      console.error("[drama-search] error:", e);
    }
  }

  const onInput = () => {
    if (!input) return;
    const v = input.value.trim();

    if (!v) {
      clearResult();
      setUrlQ("");
      return;
    }
    if (v.length < 2) return;

    clearTimeout(t);
    t = setTimeout(() => performSearch(v), 400);
  };

  if (form && input) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      performSearch(input.value);
    });
    input.addEventListener("input", onInput);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const q = new URLSearchParams(location.search).get("q");
    if (q && input) {
      input.value = q;
      performSearch(q);
    }
  });
})();
