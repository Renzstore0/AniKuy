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

  // ✅ pakai BASE URL full biar gak ketuker sama proxy lokal
  const API_BASE = "https://dramabox.sansekai.my.id/api/dramabox";
  const ENDPOINT_TRENDING = `${API_BASE}/trending`;
  const ENDPOINT_VIP = `${API_BASE}/vip`;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const showLoading = () => {
    document.body.classList.add("is-loading");
    if (el.loading) el.loading.classList.add("show");
    if (el.content) el.content.style.display = "none";
  };

  const hideLoading = () => {
    document.body.classList.remove("is-loading");
    if (el.loading) el.loading.classList.remove("show");
    if (el.content) el.content.style.display = "";
  };

  const apiGet = async (url) => {
    const join = url.includes("?") ? "&" : "?";
    const full = `${url}${join}_=${Date.now()}`;
    const res = await fetch(full, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      headers: { accept: "*/*" },
    });
    if (!res.ok) throw new Error(`HTTP_${res.status}`);
    return await res.json();
  };

  const fetchWithRetry = async (fn, { delay = 2000 } = {}) => {
    while (true) {
      try {
        return await fn();
      } catch (e) {
        console.error("[EXPLORE] retry", e);
        await sleep(delay);
      }
    }
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

  const metaTags = (tags) => {
    if (!Array.isArray(tags)) return "";
    return tags.slice(0, 3).join(", ");
  };

  const renderGrid = (container, list) => {
    if (!container) return;
    container.innerHTML = "";

    (list || []).forEach((b) => {
      const card = createAnimeCard(
        { title: b.bookName || "-", poster: b.coverWap || b.cover || "" },
        {
          badgeBottom: b.chapterCount ? `Eps ${b.chapterCount}` : "",
          meta: metaTags(b.tags) || "",
          href: toHref(b),
          onClick: () => storeBook(b),
        }
      );
      container.appendChild(card);
    });
  };

  // ✅ trending response: array langsung
  const normalizeTrending = (j) => (Array.isArray(j) ? j : []);

  // ✅ vip response: object, ambil semua columnVoList.bookList lalu flatten + dedupe
  const extractVipBooks = (j) => {
    const out = [];
    const pushList = (arr) => {
      if (!Array.isArray(arr)) return;
      for (const x of arr) {
        if (x && x.bookId) out.push(x);
      }
    };

    pushList(j?.watchHistory);
    if (Array.isArray(j?.columnVoList)) {
      for (const col of j.columnVoList) pushList(col?.bookList);
    }
    pushList(j?.recommendList?.records);
    pushList(j?.newTheaterList?.records);

    // dedupe by bookId
    const map = new Map();
    for (const b of out) {
      if (!map.has(b.bookId)) map.set(b.bookId, b);
    }
    return Array.from(map.values());
  };

  const setActiveTab = (which) => {
    const isTrending = which === "trending";

    if (el.tabTrending) el.tabTrending.classList.toggle("active", isTrending);
    if (el.tabVip) el.tabVip.classList.toggle("active", !isTrending);

    if (el.panelTrending) el.panelTrending.classList.toggle("active", isTrending);
    if (el.panelVip) el.panelVip.classList.toggle("active", !isTrending);
  };

  const initTabs = () => {
    if (el.tabTrending) el.tabTrending.onclick = () => setActiveTab("trending");
    if (el.tabVip) el.tabVip.onclick = () => setActiveTab("vip");
  };

  document.addEventListener("DOMContentLoaded", async () => {
    showLoading();
    initTabs();

    // ✅ tunggu 2-2nya kelar (biar sesuai request: selesai semua baru tampil)
    const [trendingRaw, vipRaw] = await Promise.all([
      fetchWithRetry(() => apiGet(ENDPOINT_TRENDING)),
      fetchWithRetry(() => apiGet(ENDPOINT_VIP)),
    ]);

    const trendingList = normalizeTrending(trendingRaw).filter((x) => x && x.bookId);
    const vipList = extractVipBooks(vipRaw).filter((x) => x && x.bookId);

    // render dua-duanya dulu
    renderGrid(el.trendingGrid, trendingList);
    renderGrid(el.vipGrid, vipList);

    // DEBUG (boleh hapus)
    console.log("TRENDING first:", trendingList[0]?.bookId);
    console.log("VIP first:", vipList[0]?.bookId);

    // default trending aktif
    setActiveTab("trending");
    hideLoading();
  });
})();
