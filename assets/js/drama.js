/* assets/js/drama.js */
(() => {
  "use strict";

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

  const API_BASE = "https://api.ryhar.my.id/api/internet/dramabox";

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const getApiKey = () => {
    const k1 = (window.DRAMABOX_APIKEY || "").trim();
    const k2 = (document.body?.dataset?.dramaboxApikey || "").trim();
    const k3 = (window.__CONFIG__?.dramaboxApikey || "").trim();
    return k1 || k2 || k3 || "";
  };

  const withTimeout = async (p, ms = 15000) => {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), ms);
    try {
      return await p(ac.signal);
    } finally {
      clearTimeout(t);
    }
  };

  const resolveUrl = (path, apikey) => {
    // support:
    // - "/api/dramabox/latest"  -> API_BASE + "/latest"
    // - "/latest"              -> API_BASE + "/latest"
    // - "https://..."          -> 그대로
    let endpoint = path || "";
    if (/^https?:\/\//i.test(endpoint)) {
      // ok
    } else if (endpoint.startsWith("/api/dramabox/")) {
      endpoint = endpoint.replace("/api/dramabox", "");
      endpoint = API_BASE + endpoint;
    } else if (endpoint.startsWith("/")) {
      endpoint = API_BASE + endpoint;
    } else {
      endpoint = API_BASE + "/" + endpoint;
    }

    const u = new URL(endpoint);
    if (apikey) u.searchParams.set("apikey", apikey);
    return u.toString();
  };

  const apiGetDrama = async (path) => {
    const apikey = getApiKey();
    if (!apikey) throw new Error("DRAMA_NO_APIKEY");

    const url = resolveUrl(path, apikey);

    const res = await withTimeout(
      (signal) =>
        fetch(url, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal,
        }),
      20000
    );

    if (!res.ok) throw new Error(`DRAMA_HTTP_${res.status}`);

    const j = await res.json().catch(() => null);
    if (!j) throw new Error("DRAMA_INVALID_JSON");

    // format kamu: { success:true, message:"Success", result:[...] }
    if (j.success !== true) throw new Error(j.message || "DRAMA_API_FAIL");

    return j;
  };

  const normalizeList = (j) => {
    if (Array.isArray(j)) return j;

    // ✅ format anabot: { success:true, data:{ result:[...] } }
    if (Array.isArray(j?.data?.result)) return j.data.result;
    if (Array.isArray(j?.data?.list)) return j.data.list;
    if (Array.isArray(j?.data)) return j.data;

    // format kamu: { success:true, result:[...] }
    if (Array.isArray(j?.result)) return j.result;

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

  // fallback kalau createAnimeCard belum ada
  const createFallbackCard = (b, href) => {
    const a = document.createElement("a");
    a.href = href;
    a.className = "drama-card";
    a.style.display = "block";
    a.style.textDecoration = "none";

    const img = document.createElement("img");
    img.src = b.coverWap || b.cover || "";
    img.alt = b.bookName || "cover";
    img.loading = "lazy";
    img.style.width = "100%";
    img.style.borderRadius = "12px";

    const t = document.createElement("div");
    t.textContent = b.bookName || "-";
    t.style.marginTop = "8px";
    t.style.fontSize = "14px";
    t.style.color = "inherit";

    a.appendChild(img);
    a.appendChild(t);
    return a;
  };

  const renderGrid = (container, list) => {
    if (!container) return;
    container.innerHTML = "";

    (list || []).forEach((b) => {
      const href = toHref(b);

      const card =
        typeof window.createAnimeCard === "function"
          ? window.createAnimeCard(
              { title: b.bookName || "-", poster: b.coverWap || b.cover || "" },
              {
                badgeBottom: b.chapterCount ? `Eps ${b.chapterCount}` : "",
                meta: metaTags(b.tags) || "",
                href,
                onClick: () => storeBook(b),
              }
            )
          : (() => {
              const x = createFallbackCard(b, href);
              x.addEventListener("click", () => storeBook(b));
              return x;
            })();

      container.appendChild(card);
    });
  };

  async function loadLatestOnce() {
    const j = await apiGetDrama("/api/dramabox/latest");
    const listRaw = normalizeList(j);
    if (!Array.isArray(listRaw)) throw new Error("DRAMA_INVALID_RESPONSE");

    const list = listRaw.filter((x) => x && x.bookId);
    renderGrid(el.latest, list);
    return list;
  }

  // HERO "Untuk Kamu" (optional)
  function initForYouHero(list) {
    const items = (list || [])
      .filter((x) => x && x.bookId && (x.coverWap || x.cover) && (x.cardType === 1 || x.cardType == null))
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
        const j = await apiGetDrama("/api/dramabox/foryou");
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
