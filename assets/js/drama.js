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

  const normalizeList = (j) => {
    if (Array.isArray(j)) return j;
    if (Array.isArray(j?.data)) return j.data;
    if (Array.isArray(j?.list)) return j.list;
    if (Array.isArray(j?.result)) return j.result;
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
      .filter((x) => x && x.cardType === 1 && x.bookId && x.coverWap)
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

    const render = () => {
      const n = items.length;
      const cur = items[idx];
      const prev = items[mod(idx - 1, n)];
      const next = items[mod(idx + 1, n)];

      if (el.heroName) el.heroName.textContent = (cur.bookName || "").trim();

      if (el.heroPosterPrev) el.heroPosterPrev.src = prev.coverWap || "";
      if (el.heroPoster) el.heroPoster.src = cur.coverWap || "";
      if (el.heroPosterNext) el.heroPosterNext.src = next.coverWap || "";

      setDots();
    };

    const goDetail = () => {
      const cur = items[idx];
      if (!cur) return;
      storeBook(cur);
      location.href = toHref(cur);
    };

    el.heroPrevBtn && (el.heroPrevBtn.onclick = () => {
      idx = mod(idx - 1, items.length);
      render();
    });

    el.heroNextBtn && (el.heroNextBtn.onclick = () => {
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
