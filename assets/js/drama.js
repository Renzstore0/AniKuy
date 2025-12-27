/* ========= assets/js/drama.js ========= */
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

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Ryhar only: list ada di j.result
  const normalizeList = (j) => (Array.isArray(j?.result) ? j.result : []);

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
    // still works (apikey auto)
    const j = await window.apiGetDrama("/latest");
    const list = normalizeList(j).filter((x) => x && x.bookId);
    if (!list.length) throw new Error("DRAMA_EMPTY");
    renderGrid(el.latest, list);
    return list;
  }

  function initForYouHero(list) {
    const items = (list || [])
      .filter((x) => x && x.bookId && (x.coverWap || x.cover))
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
        const j = await window.apiGetDrama("/foryou");
        const list = normalizeList(j);
        if (Array.isArray(list) && list.length) {
          initForYouHero(list);
          return;
        }
      } catch {}
      await sleep(6000);
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    showLoading();

    tryLoadForYouLoop();

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
