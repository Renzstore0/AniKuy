(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const toast = (m) => typeof showToast === "function" && showToast(m);

  const el = {
    loading: $("dramaExploreLoading"),
    trending: $("dramaTrendingRow"),
    vip: $("dramaVipRow"),
    back: $("backButton"),
  };

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

  // ====== FETCH JSON (timeout + fallback proxy) ======
  const fetchJsonTry = async (url, timeoutMs = 15000) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);

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
      if (!res.ok) throw new Error(`HTTP ${res.status} :: ${text.slice(0, 160)}`);

      try {
        return JSON.parse(text);
      } catch {
        throw new Error("Response bukan JSON");
      }
    } finally {
      clearTimeout(t);
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

  const apiGetDramaSafe = async (path) => {
    if (typeof window.apiGetDrama === "function") return await window.apiGetDrama(path);

    const pth = String(path || "");
    const url = pth.startsWith("/") ? DRAMA_BASE + pth : `${DRAMA_BASE}/${pth}`;
    const join = url.includes("?") ? "&" : "?";
    const full = `${url}${join}apikey=${encodeURIComponent(getDramaApiKey())}`;
    return await fetchJsonWithFallback(full);
  };

  // ====== NORMALIZE ======
  const normalizeBooks = (payload) => {
    const arr = payload?.data?.result;
    return Array.isArray(arr) ? arr : [];
  };

  const storeBook = (b) => {
    try {
      if (!b?.bookId) return;
      sessionStorage.setItem(`dramabox_book_${b.bookId}`, JSON.stringify(b));
    } catch {}
  };

  const renderRow = (wrap, list) => {
    if (!wrap) return;
    wrap.innerHTML = "";

    list.forEach((b) => {
      const cover = b?.coverWap || b?.cover || "";
      const href = `/drama/detail?bookId=${encodeURIComponent(b?.bookId || "")}&name=${encodeURIComponent(
        b?.bookName || ""
      )}`;

      wrap.appendChild(
        createAnimeCard(
          { title: b?.bookName || "-", poster: cover },
          {
            meta: Array.isArray(b?.tags) ? b.tags.slice(0, 3).join(", ") : "",
            badgeBottom: b?.chapterCount ? `Eps ${b.chapterCount}` : "",
            href,
            onClick: () => storeBook(b),
          }
        )
      );
    });
  };

  const setLoading = (on) => {
    if (!el.loading) return;
    el.loading.style.display = on ? "" : "none";
  };

  const load = async () => {
    setLoading(true);
    try {
      // ✅ Trending: /classification
      // ✅ VIP: /rank
      const [trPayload, vipPayload] = await Promise.all([
        apiGetDramaSafe("/classification"),
        apiGetDramaSafe("/rank"),
      ]);

      const trending = normalizeBooks(trPayload);
      const vip = normalizeBooks(vipPayload);

      renderRow(el.trending, trending);
      renderRow(el.vip, vip);

      if (!trending.length && !vip.length) toast("Data kosong.");
    } catch (e) {
      console.error("[drama-explore] error:", e);
      toast("Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    if (el.back) {
      el.back.addEventListener("click", () =>
        history.length > 1 ? history.back() : (location.href = "/drama")
      );
    }
    load();
  });
})();
