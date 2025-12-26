(() => {
  "use strict";

  // ====== CONFIG (ONLY RYHAR) ======
  const API_BASE = "https://api.ryhar.my.id";
  const API_KEY = "RyAPIs";

  const ENDPOINTS = {
    latest: "/api/internet/dramabox/latest",
    foryou: "/api/internet/dramabox/foryou",
  };

  const MAX_RETRY_LATEST = 8;
  const RETRY_DELAY_LATEST = 2500;

  const MAX_TRY_FORYOU = 10;
  const RETRY_DELAY_FORYOU = 6000;

  // ====== HELPERS ======
  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const buildUrl = (path) => {
    const u = new URL(path, API_BASE);
    if (API_KEY && !u.searchParams.get("apikey")) u.searchParams.set("apikey", API_KEY);
    return u.toString();
  };

  const fetchJson = async (url, timeoutMs = 15000) => {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" }, // simple header (hindari preflight)
        cache: "no-store",
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`HTTP_${res.status}`);

      const text = await res.text();
      let j;
      try {
        j = text ? JSON.parse(text) : null;
      } catch {
        throw new Error("INVALID_JSON");
      }

      if (j && j.success === false) throw new Error(j.message || "API_FAIL");
      return j;
    } catch (e) {
      if (e?.name === "AbortError") throw new Error("TIMEOUT");
      throw e;
    } finally {
      clearTimeout(t);
    }
  };

  const apiGetDrama = (kind) => fetchJson(buildUrl(ENDPOINTS[kind]));

  // response ryhar: { success:true, result:[...] }
  const normalizeList = (j) => (Array.isArray(j?.result) ? j.result : null);

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

    // latest
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

  const showFatal = (msg) => {
    hideLoading();

    let box = document.getElementById("dramaFatalBox");
    if (!box) {
      box = document.createElement("div");
      box.id = "dramaFatalBox";
      box.style.cssText =
        "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:9999;" +
        "background:rgba(0,0,0,.45);padding:16px;";
      box.innerHTML = `
        <div style="max-width:520px;width:100%;background:#0b1220;border:1px solid rgba(255,255,255,.12);
                    border-radius:14px;padding:16px 14px;color:#fff;font-family:system-ui">
          <div style="font-weight:700;margin-bottom:6px">Gagal memuat DramaBox</div>
          <div id="dramaFatalMsg" style="opacity:.85;font-size:13px;line-height:1.4;margin-bottom:12px"></div>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button id="dramaFatalRetry" style="padding:9px 12px;border-radius:10px;border:0;cursor:pointer">Coba lagi</button>
          </div>
        </div>
      `;
      document.body.appendChild(box);
      box.querySelector("#dramaFatalRetry").onclick = () => location.reload();
    }
    box.querySelector("#dramaFatalMsg").textContent = msg || "Request gagal.";
    box.style.display = "flex";
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
    const j = await apiGetDrama("latest");
    const listRaw = normalizeList(j);
    if (!Array.isArray(listRaw)) throw new Error("INVALID_RESPONSE");

    const list = listRaw.filter((x) => x && x.bookId);
    renderGrid(el.latest, list);
    return list;
  }

  // HERO "Untuk Kamu"
  function initForYouHero(list) {
    const items = (list || [])
      .filter((x) => x && x.bookId && (x.coverWap || x.cover))
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

  async function tryLoadForYouLimited() {
    for (let i = 0; i < MAX_TRY_FORYOU; i++) {
      try {
        const j = await apiGetDrama("foryou");
        const list = normalizeList(j);
        if (Array.isArray(list)) {
          initForYouHero(list);
          return;
        }
      } catch {}
      await sleep(RETRY_DELAY_FORYOU);
    }
    // gagal: hero aja nggak ditampilin, tapi latest tetap jalan
  }

  document.addEventListener("DOMContentLoaded", async () => {
    showLoading();

    // foryou non-blocking
    tryLoadForYouLimited();

    // latest: retry terbatas
    let lastErr = null;
    for (let i = 0; i < MAX_RETRY_LATEST; i++) {
      try {
        await loadLatestOnce();
        hideLoading();
        return;
      } catch (e) {
        lastErr = e;
        console.error("[DRAMA] latest fail", e);
        await sleep(RETRY_DELAY_LATEST);
      }
    }

    // stop loading, tampilkan error
    showFatal(
      `Gagal ambil data dari API.\nKemungkinan CORS diblok browser.\nDetail: ${String(lastErr?.message || lastErr)}`
    );
  });
})();
