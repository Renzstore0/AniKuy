(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const toast = (m) => typeof showToast === "function" && showToast(m);

  const el = {
    loading: $("dramaLoading"),
    // hero (pakai id yang sama dengan anime home)
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

    // grids
    trending: $("dramaTrendingRow"),
    latest: $("dramaLatestRow"),
    popular: $("dramaPopularRow"),
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

  async function loadGrid(path, container) {
    try {
      const j = await apiGetDrama(path);
      if (!Array.isArray(j)) return [];
      // for safety (kadang ada cardType 3)
      const list = j.filter((x) => x && x.bookId);
      renderGrid(container, list);
      return list;
    } catch {
      return [];
    }
  }

  // ✅ HERO "Untuk Kamu" (mirip anime "Rilis Hari Ini")
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

      if (el.heroPosterPrev) el.heroPosterPrev.alt = `Poster ${(prev.bookName || "Drama").trim()}`;
      if (el.heroPoster) el.heroPoster.alt = `Poster ${(cur.bookName || "Drama").trim()}`;
      if (el.heroPosterNext) el.heroPosterNext.alt = `Poster ${(next.bookName || "Drama").trim()}`;

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

    // klik poster utama -> detail
    if (el.heroPoster) {
      el.heroPoster.style.cursor = "pointer";
      el.heroPoster.onclick = goDetail;
    }

    render();
  }

  document.addEventListener("DOMContentLoaded", async () => {
    el.loading && el.loading.classList.add("show");

    // HERO dari /foryou
    try {
      const foryou = await apiGetDrama("/api/dramabox/foryou");
      if (Array.isArray(foryou)) initForYouHero(foryou);
    } catch {}

    // grid 2 kolom
    await loadGrid("/api/dramabox/trending", el.trending);
    await loadGrid("/api/dramabox/latest", el.latest);
    await loadGrid("/api/dramabox/populersearch", el.popular);

    el.loading && el.loading.classList.remove("show");
    toast("Drama siap!");
  });
})();
