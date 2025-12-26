(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const el = {
    loading: $("exploreLoading"),
    content: $("exploreContent"),

    tabTrending: $("tabTrending"),
    tabVip: $("tabVip"),
    panelTrending: $("panelTrending"),
    panelVip: $("panelVip"),

    trendingGrid: $("trendingGrid"),
    vipGrid: $("vipGrid"),
  };

  const API_BASE = "https://dramabox.sansekai.my.id/api/dramabox";
  const ENDPOINTS = {
    trending: [
      `${API_BASE}/trending`,
      `/api/dramabox/trending`, // fallback kalau kamu punya proxy di domain anikuy
    ],
    vip: [
      `${API_BASE}/vip`,
      `/api/dramabox/vip`, // fallback kalau kamu punya proxy di domain anikuy
    ],
  };

  const showLoading = () => {
    document.body.classList.add("is-loading");
    el.loading?.classList.add("show");
    if (el.content) el.content.style.display = "none";
  };

  const hideLoading = () => {
    document.body.classList.remove("is-loading");
    el.loading?.classList.remove("show");
    if (el.content) el.content.style.display = "";
  };

  const toast = (msg) => {
    const t = $("toast");
    if (!t) return alert(msg);
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2800);
  };

  const fetchJson = async (url, timeoutMs = 12000) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);

    try {
      const join = url.includes("?") ? "&" : "?";
      const full = `${url}${join}_=${Date.now()}`;

      const res = await fetch(full, {
        method: "GET",
        mode: "cors",
        cache: "no-store",
        headers: { accept: "*/*" },
        signal: ctrl.signal,
      });

      if (!res.ok) throw new Error(`HTTP_${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  };

  const fetchAny = async (candidates, { retries = 2, timeoutMs = 12000 } = {}) => {
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
      for (const url of candidates) {
        try {
          return await fetchJson(url, timeoutMs);
        } catch (e) {
          lastErr = e;
          // lanjut coba kandidat berikutnya
        }
      }
    }
    throw lastErr || new Error("FETCH_FAILED");
  };

  const storeBook = (b) => {
    try {
      if (!b?.bookId) return;
      sessionStorage.setItem(`dramabox_book_${b.bookId}`, JSON.stringify(b));
    } catch {}
  };

  const toHref = (b) => {
    const id = encodeURIComponent(b.bookId || "");
    const name = encodeURIComponent(b.bookName || "");
    return `/drama/detail?bookId=${id}&name=${name}`;
  };

  const metaTags = (tags) => (Array.isArray(tags) ? tags.slice(0, 3).join(", ") : "");

  const createFallbackCard = (b) => {
    const a = document.createElement("a");
    a.className = "anime-card";
    a.href = toHref(b);
    a.onclick = () => storeBook(b);

    const img = document.createElement("img");
    img.className = "anime-poster";
    img.alt = b.bookName || "";
    img.loading = "lazy";
    img.src = b.coverWap || b.cover || "";

    const badge = document.createElement("div");
    badge.className = "badge-bottom";
    badge.textContent = b.chapterCount ? `Eps ${b.chapterCount}` : "";

    const title = document.createElement("div");
    title.className = "anime-title";
    title.textContent = b.bookName || "-";

    const meta = document.createElement("div");
    meta.className = "anime-meta";
    meta.textContent = metaTags(b.tags);

    a.appendChild(img);
    if (badge.textContent) a.appendChild(badge);
    a.appendChild(title);
    if (meta.textContent) a.appendChild(meta);

    return a;
  };

  const renderGrid = (container, list) => {
    if (!container) return;
    container.innerHTML = "";

    const hasCreateAnimeCard = typeof window.createAnimeCard === "function";

    (list || []).forEach((b) => {
      let card;
      if (hasCreateAnimeCard) {
        card = window.createAnimeCard(
          { title: b.bookName || "-", poster: b.coverWap || b.cover || "" },
          {
            badgeBottom: b.chapterCount ? `Eps ${b.chapterCount}` : "",
            meta: metaTags(b.tags) || "",
            href: toHref(b),
            onClick: () => storeBook(b),
          }
        );
      } else {
        card = createFallbackCard(b);
      }
      container.appendChild(card);
    });
  };

  const normalizeTrending = (j) => (Array.isArray(j) ? j : []);

  const extractVipBooks = (j) => {
    const out = [];
    const pushList = (arr) => {
      if (!Array.isArray(arr)) return;
      for (const x of arr) if (x?.bookId) out.push(x);
    };

    pushList(j?.watchHistory);
    if (Array.isArray(j?.columnVoList)) {
      for (const col of j.columnVoList) pushList(col?.bookList);
    }
    pushList(j?.recommendList?.records);
    pushList(j?.newTheaterList?.records);

    const map = new Map();
    for (const b of out) if (!map.has(b.bookId)) map.set(b.bookId, b);
    return Array.from(map.values());
  };

  const setActiveTab = (which) => {
    const isTrending = which === "trending";

    el.tabTrending?.classList.toggle("active", isTrending);
    el.tabVip?.classList.toggle("active", !isTrending);

    el.panelTrending?.classList.toggle("active", isTrending);
    el.panelVip?.classList.toggle("active", !isTrending);
  };

  const initTabs = () => {
    if (el.tabTrending) el.tabTrending.onclick = () => setActiveTab("trending");
    if (el.tabVip) el.tabVip.onclick = () => setActiveTab("vip");
  };

  const showErrorScreen = (msg) => {
    if (!el.content) return;
    el.content.style.display = "";
    el.content.innerHTML = `
      <h1 class="page-title">Explore</h1>
      <div style="padding:14px;opacity:.9">${msg}</div>
      <button id="btnRetry" class="segment-tab active" style="margin:0 14px;display:inline-block;width:auto">Coba Lagi</button>
    `;
    $("btnRetry")?.addEventListener("click", () => location.reload());
  };

  document.addEventListener("DOMContentLoaded", async () => {
    showLoading();
    initTabs();

    try {
      const [trRes, vipRes] = await Promise.allSettled([
        fetchAny(ENDPOINTS.trending, { retries: 2, timeoutMs: 12000 }),
        fetchAny(ENDPOINTS.vip, { retries: 2, timeoutMs: 12000 }),
      ]);

      const trendingOk = trRes.status === "fulfilled";
      const vipOk = vipRes.status === "fulfilled";

      if (!trendingOk && !vipOk) {
        hideLoading();
        showErrorScreen("Gagal memuat data (kemungkinan CORS / server down).");
        return;
      }

      if (trendingOk) {
        const trendingList = normalizeTrending(trRes.value).filter((x) => x?.bookId);
        renderGrid(el.trendingGrid, trendingList);
      } else {
        toast("Trending gagal dimuat.");
      }

      if (vipOk) {
        const vipList = extractVipBooks(vipRes.value).filter((x) => x?.bookId);
        renderGrid(el.vipGrid, vipList);
      } else {
        toast("VIP gagal dimuat.");
      }

      setActiveTab("trending");
      hideLoading();
    } catch (e) {
      console.error(e);
      hideLoading();
      showErrorScreen("Ada error di script. Cek console (F12).");
    }
  });
})();
