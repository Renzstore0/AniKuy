(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const toast = (m) => typeof showToast === "function" && showToast(m);

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

  // fallback card kalau createAnimeCard tidak ada
  const buildCardFallback = (b) => {
    const c = document.createElement("div");
    c.className = "anime-card";
    const poster = b.coverWap || b.cover || "/assets/img/placeholder-poster.png";
    const title = (b.bookName || "-").trim();
    const badge = b.chapterCount ? `Eps ${b.chapterCount}` : "";
    const meta = metaTags(b.tags) || "";

    c.innerHTML = `
      <div class="anime-thumb">
        <img src="${poster}" alt="${title}">
        ${badge ? `<div class="badge-bottom-left">${badge}</div>` : ""}
      </div>
      <div class="anime-title">${title}</div>
      ${meta ? `<div class="anime-meta">${meta}</div>` : ""}
    `;

    c.onclick = () => {
      storeBook(b);
      location.href = toHref(b);
    };

    return c;
  };

  const renderGrid = (container, list) => {
    if (!container) return;
    container.innerHTML = "";

    (list || []).forEach((b) => {
      const card =
        typeof window.createAnimeCard === "function"
          ? window.createAnimeCard(
              { title: b.bookName || "-", poster: b.coverWap || b.cover || "" },
              {
                badgeBottom: b.chapterCount ? `Eps ${b.chapterCount}` : "",
                meta: metaTags(b.tags) || "",
                href: toHref(b),
                onClick: () => storeBook(b),
              }
            )
          : buildCardFallback(b);

      container.appendChild(card);
    });
  };

  async function loadGrid(path, container) {
    try {
      const j = await window.apiGetDrama(path);
      if (!Array.isArray(j)) return [];
      const list = j.filter((x) => x && x.bookId);
      renderGrid(container, list);
      return list;
    } catch {
      // toast sudah ditangani di core.js
      return [];
    }
  }

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

    if (el.heroPoster) {
      el.heroPoster.style.cursor = "pointer";
      el.heroPoster.onclick = goDetail;
    }

    render();
  }

  document.addEventListener("DOMContentLoaded", async () => {
    el.loading && el.loading.classList.add("show");

    try {
      // HERO dari /foryou, kalau gagal fallback pakai /latest
      let heroData = [];
      try {
        const foryou = await window.apiGetDrama("/api/dramabox/foryou");
        if (Array.isArray(foryou)) heroData = foryou;
      } catch {}

      if (!heroData.length) {
        try {
          const latest = await window.apiGetDrama("/api/dramabox/latest");
          if (Array.isArray(latest)) heroData = latest;
        } catch {}
      }

      if (heroData.length) initForYouHero(heroData);

      await loadGrid("/api/dramabox/trending", el.trending);
      await loadGrid("/api/dramabox/latest", el.latest);
      await loadGrid("/api/dramabox/populersearch", el.popular);

      toast("Drama siap!");
    } finally {
      el.loading && el.loading.classList.remove("show");
    }
  });
})();
