(() => {
  "use strict";

  // ====== CONFIG API (update) ======
  const API_BASE = "https://api.ryhar.my.id";
  const API_KEY = "RyAPIs";

  const ENDPOINTS = {
    latest: "/api/internet/dramabox/latest",
    foryou: "/api/internet/dramabox/foryou",
  };

  // ====== HELPERS ======
  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const apiGetDrama = async (path, opts = {}) => {
    const timeoutMs = Number(opts.timeoutMs ?? 15000);

    const url = new URL(path, API_BASE);
    if (API_KEY && !url.searchParams.get("apikey")) url.searchParams.set("apikey", API_KEY);

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`HTTP_${res.status}`);

      const text = await res.text();
      let j = null;
      try {
        j = text ? JSON.parse(text) : null;
      } catch {
        throw new Error("DRAMA_INVALID_JSON");
      }

      // kalau API pakai flag success/message
      if (j && j.success === false) throw new Error(j.message || "DRAMA_API_FAIL");

      return j;
    } catch (e) {
      if (e?.name === "AbortError") throw new Error("DRAMA_TIMEOUT");
      throw e;
    } finally {
      clearTimeout(t);
    }
  };

  const normalizeList = (j) => {
    if (Array.isArray(j)) return j;

    // format: { success:true, result:[...] }
    if (Array.isArray(j?.result)) return j.result;

    // format anabot: { success:true, data:{ result:[...] } }
    if (Array.isArray(j?.data?.result)) return j.data.result;
    if (Array.isArray(j?.data?.list)) return j.data.list;
    if (Array.isArray(j?.data)) return j.data;

    // fallback format lain
    if (Array.isArray(j?.list)) return j.list;
    if (Array.isArray(j?.items)) return j.items;

    return null;
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

  // ====== ELEMENTS ======
  const el = {
    loading: $("dramaLoading"),

    // hero
    heroSection: $("todaySection"),
    heroTitle: $("todayHeaderTitle"),
    heroPrevBtn: $("todayPrevBtn"),
    heroNextBtn: $("todayNextBtn"),
    heroPosterPrev: $("todayPosterPrev"),
    heroPoster: $("todayPoster"),
    heroPosterNext: $("todayPosterNext"),
    heroName: $("todayTitle"),
    heroWatchBtn: $("todayWatchBtn"),
    heroDots: $("todayDots"),

    // only latest
    latest: $("dramaLatestRow"),
  };

  // ====== UI ======
  const showLoading = () => {
    document.body.classList.add("is-loading");
    el.loading && el.loading.classList.add("show");
  };

  const hideLoading = () => {
    document.body.classList.remove("is-loading");
    el.loading && el.loading.classList.remove("show");
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

  async function loadLatestOnce() {
    const j = await apiGetDrama(ENDPOINTS.latest);
    const listRaw = normalizeList(j);
    if (!Array.isArray(listRaw)) throw new Error("DRAMA_INVALID_RESPONSE");

    const list = listRaw.filter((x) => x && x.bookId);
    renderGrid(el.latest, list);
    return list;
  }

  // HERO "Untuk Kamu"
  function initForYouHero(list) {
    const items = (list || [])
      .filter((x) => x && x.bookId && (x.coverWap || x.cover) && (x.cardType === 1 || x.cardType == null))
      .slice(0, 12);

    if (!el.heroSection || items.length === 0) return;

    el.heroTitle && (el.heroTitle.textContent = "Untuk Kamu");
    el.heroSection.style.display = "";

    let idx = 0;
    const mod = (n, m) => ((n % m) + m) % m;
    const posterOf = (x) => (x?.coverWap || x?.cover || "");

    const setDots = () => {
      if (!el.heroDots) return;
      el.heroDots.innerHTML = "";
      items.forEach((_, i) => {
        const dot = document.createElement("span");
        dot.className = i === idx ? "active" : "";
        dot.onclick = () => {
          idx = i;
          render();
        };
        el.heroDots.appendChild(dot);
      });
    };

    const render = () => {
      const n = items.length;
      const cur = items[idx];
      const prev = items[mod(idx - 1, n)];
      const next = items[mod(idx + 1, n)];

      if (el.heroName) el.heroName.textContent = (cur.bookName || "").trim();

      if (el.heroPosterPrev) el.heroPosterPrev.src = posterOf(prev);
      if (el.heroPoster) el.heroPoster.src = posterOf(cur);
      if (el.heroPosterNext) el.heroPosterNext.src = posterOf(next);

      setDots();
    };

    const goDetail = () => {
      const cur = items[idx];
      if (!cur) return;
      storeBook(cur);
      location.href = toHref(cur);
    };

    el.heroPrevBtn &&
      (el.heroPrevBtn.onclick = () => {
        idx = mod(idx - 1, items.length);
        render();
      });

    el.heroNextBtn &&
      (el.heroNextBtn.onclick = () => {
        idx = mod(idx + 1, items.length);
        render();
      });

    el.heroWatchBtn && (el.heroWatchBtn.onclick = goDetail);

    if (el.heroPoster) {
      el.heroPoster.style.cursor = "pointer";
      el.heroPoster.onclick = goDetail;
    }

    render();
  }

  async function tryLoadForYouLoop() {
    while (true) {
      try {
        const j = await apiGetDrama(ENDPOINTS.foryou);
        const list = normalizeList(j);
        if (Array.isArray(list)) {
          initForYouHero(list);
          return;
        }
      } catch {}
      await sleep(6000);
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    showLoading();

    // foryou di background (nggak ngeblok latest)
    tryLoadForYouLoop();

    // latest: retry sampai sukses, baru loading hilang
    while (true) {
      try {
        await loadLatestOnce();
        hideLoading();
        break;
      } catch (e) {
        console.error("[DRAMA] latest fail", e);
        await sleep(2500);
      }
    }
  });
})();
