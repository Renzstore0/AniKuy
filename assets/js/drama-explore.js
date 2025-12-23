(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const toast = (m) => typeof showToast === "function" && showToast(m);

  const el = {
    back: $("backButton"),
    loading: $("dramaExploreLoading"),
    wrap: $("dramaExploreWrap"),
    trendingGrid: $("trendingGrid"),
    vipGrid: $("vipGrid"),
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const showLoading = () => {
    document.body.classList.add("is-loading");
    el.loading && el.loading.classList.add("show");
    if (el.wrap) el.wrap.style.display = "none";
  };

  const hideLoading = () => {
    document.body.classList.remove("is-loading");
    el.loading && el.loading.classList.remove("show");
    if (el.wrap) el.wrap.style.display = "";
  };

  // ====== API safe ======
  const DRAMA_BASE = "https://anabot.my.id/api/search/drama/dramabox";
  const LS_DRAMA_KEY = "dramabox_apikey";

  const getDramaApiKey = () => {
    const k =
      (window.DRAMA_APIKEY && String(window.DRAMA_APIKEY).trim()) ||
      (localStorage.getItem(LS_DRAMA_KEY) || "").trim() ||
      "freeApikey";
    return k;
  };

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

  const normalizeList = (j) => {
    if (Array.isArray(j)) return j;
    if (Array.isArray(j?.data?.result)) return j.data.result;
    if (Array.isArray(j?.data?.list)) return j.data.list;
    if (Array.isArray(j?.data)) return j.data;
    if (Array.isArray(j?.list)) return j.list;
    if (Array.isArray(j?.result)) return j.result;
    if (Array.isArray(j?.items)) return j.items;
    return [];
  };

  const storeBook = (b) => {
    try {
      if (!b?.bookId) return;
      sessionStorage.setItem(`dramabox_book_${b.bookId}`, JSON.stringify(b));
    } catch {}
  };

  const toHref = (b) => {
    const id = encodeURIComponent(b?.bookId || "");
    const name = encodeURIComponent(b?.bookName || "");
    return `/drama/detail?bookId=${id}&name=${name}`;
  };

  const metaTags = (tags) => (Array.isArray(tags) ? tags.slice(0, 3).join(", ") : "");

  const renderGrid = (container, list) => {
    if (!container) return;
    container.innerHTML = "";

    (list || []).forEach((b) => {
      const card =
        typeof window.createAnimeCard === "function"
          ? window.createAnimeCard(
              { title: b?.bookName || "-", poster: b?.coverWap || b?.cover || "" },
              {
                badgeBottom: b?.chapterCount ? `Eps ${b.chapterCount}` : "",
                meta: metaTags(b?.tags),
                href: toHref(b),
                onClick: () => storeBook(b),
              }
            )
          : null;

      if (card) {
        container.appendChild(card);
        return;
      }

      // fallback kalau createAnimeCard gak ada
      const a = document.createElement("a");
      a.className = "anime-card";
      a.href = toHref(b);
      a.innerHTML = `
        <div class="anime-poster"><img alt="${(b?.bookName || "").replace(/"/g, "&quot;")}"></div>
        <div class="anime-title">${b?.bookName || "-"}</div>
      `;
      const img = a.querySelector("img");
      img.src = b?.coverWap || b?.cover || "/assets/img/placeholder-poster.png";
      img.onerror = () => {
        img.onerror = null;
        img.src = "/assets/img/placeholder-poster.png";
      };
      a.addEventListener("click", () => storeBook(b));
      container.appendChild(a);
    });
  };

  const initTabs = () => {
    const tabs = document.querySelectorAll(".explore-tab");
    const panels = document.querySelectorAll(".explore-panel");
    tabs.forEach((t) => {
      t.addEventListener("click", () => {
        const key = t.getAttribute("data-tab");
        tabs.forEach((x) => x.classList.toggle("active", x === t));
        panels.forEach((p) => p.classList.toggle("active", p.getAttribute("data-tab") === key));
      });
    });
  };

  async function loadTrendingOnce() {
    const j = await apiGetDramaSafe(`/classification`);
    const list = normalizeList(j).filter((x) => x && x.bookId);
    if (!list.length) throw new Error("TRENDING_EMPTY");
    renderGrid(el.trendingGrid, list);
    return list;
  }

  async function loadVipOnce() {
    const j = await apiGetDramaSafe(`/rank`);
    const list = normalizeList(j).filter((x) => x && x.bookId);
    if (!list.length) throw new Error("VIP_EMPTY");
    renderGrid(el.vipGrid, list);
    return list;
  }

  async function loadAllBlocking() {
    let trendingDone = false;
    let vipDone = false;

    while (!trendingDone || !vipDone) {
      try {
        if (!trendingDone) {
          await loadTrendingOnce();
          trendingDone = true;
        }
      } catch (e) {
        console.error("[DRAMA-EXPLORE] trending fail", e);
      }

      try {
        if (!vipDone) {
          await loadVipOnce();
          vipDone = true;
        }
      } catch (e) {
        console.error("[DRAMA-EXPLORE] vip fail", e);
      }

      if (!trendingDone || !vipDone) await sleep(2000);
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    el.back && el.back.addEventListener("click", () => history.back());

    showLoading();

    try {
      await loadAllBlocking(); // tunggu trending & vip kelar
      initTabs();
      hideLoading();
    } catch (e) {
      console.error("[DRAMA-EXPLORE] fatal", e);
      toast("Gagal memuat explore");
      hideLoading();
    }
  });
})();
