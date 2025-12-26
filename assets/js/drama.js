(() => {
  "use strict";

  // ✅ Update REST API + APIKEY
  const API_BASE = "https://api.ryhar.my.id";
  const API_KEY = "RyAPIs";

  const $ = (id) => document.getElementById(id);

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

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ✅ Fetch helper (tetap ringan & cepat)
  async function apiGetDrama(input) {
    const url =
      typeof input === "string" && /^https?:\/\//i.test(input)
        ? input
        : `${API_BASE}${input || ""}`;

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);

    try {
      const res = await fetch(url, {
        method: "GET",
        signal: ctrl.signal,
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP_${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(t);
    }
  }

  const normalizeList = (j) => {
    if (Array.isArray(j)) return j;

    // format: { success:true, message:"Success", result:[...] }
    if (Array.isArray(j?.result)) return j.result;

    // format lain: { success:true, data:{ result:[...] } }
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
    // ✅ Updated endpoint
    const url = `${API_BASE}/api/internet/dramabox/latest?apikey=${encodeURIComponent(API_KEY)}`;
    const j = await apiGetDrama(url);

    const listRaw = normalizeList(j);
    if (!Array.isArray(listRaw)) throw new Error("DRAMA_INVALID_RESPONSE");

    const list = listRaw.filter((x) => x && x.bookId);
    renderGrid(el.latest, list);
    return list;
  }

  // HERO "Untuk Kamu" (optional)
  function initForYouHero(list) {
    const items = (list || [])
      .filter(
        (x) =>
          x &&
          x.bookId &&
          (x.coverWap || x.cover) &&
          (x.cardType === 1 || x.cardType == null)
      )
      .slice(0, 12);

    if (!el.heroSection || items.length === 0) return;

    el.heroTitle && (el.heroTitle.textContent = "Untuk Kamu");
    el.heroSection.style.display = "";

    let idx = 0;
    const mod = (n, m) => ((n % m) + m) % m;

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

    const posterOf = (x) => x?.coverWap || x?.cover || "";

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

  const showLoading = () => {
    document.body.classList.add("is-loading");
    el.loading && el.loading.classList.add("show");
  };

  const hideLoading = () => {
    document.body.classList.remove("is-loading");
    el.loading && el.loading.classList.remove("show");
  };

  async function tryLoadForYouLoop() {
    while (true) {
      try {
        // ✅ Updated endpoint
        const url = `${API_BASE}/api/internet/dramabox/foryou?apikey=${encodeURIComponent(API_KEY)}`;
        const j = await apiGetDrama(url);

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
