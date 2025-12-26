(() => {
  "use strict";

  const grid = document.getElementById("myListGrid");
  const empty = document.getElementById("myListEmpty");

  const tabAnime = document.getElementById("myListTabAnime");
  const tabDrama = document.getElementById("myListTabDrama");

  const LS_TAB = "anikuy_mylist_tab";

  const safe = (fn, fallback) => {
    try {
      return typeof fn === "function" ? fn() : fallback;
    } catch {
      return fallback;
    }
  };

  const setActiveTabUi = (type) => {
    if (!tabAnime || !tabDrama) return;
    const isAnime = type === "anime";
    tabAnime.classList.toggle("active", isAnime);
    tabDrama.classList.toggle("active", !isAnime);
    tabAnime.setAttribute("aria-selected", isAnime ? "true" : "false");
    tabDrama.setAttribute("aria-selected", !isAnime ? "true" : "false");
  };

  const storeDramaBook = (b) => {
    try {
      if (!b?.bookId) return;
      sessionStorage.setItem(
        `dramabox_book_${b.bookId}`,
        JSON.stringify({
          bookId: b.bookId,
          bookName: b.bookName || "",
          coverWap: b.coverWap || b.cover || "",
          cover: b.cover || "",
          chapterCount: b.chapterCount || "",
          tags: Array.isArray(b.tags) ? b.tags : [],
        })
      );
    } catch {}
  };

  const renderAnime = () => {
    const favs = safe(window.getFavorites, []);
    grid.innerHTML = "";
    empty.textContent = "Belum ada anime di favorit.";
    empty.style.display = favs.length ? "none" : "block";

    favs.forEach((a) =>
      grid.appendChild(
        createAnimeCard(a, {
          rating: a.rating || "",
          badgeBottom: a.episode_count ? `${a.episode_count} Eps` : "",
          meta: a.status || "",
        })
      )
    );
  };

  const renderDrama = () => {
    const favs = safe(window.getDramaFavorites, []);
    grid.innerHTML = "";
    empty.textContent = "Belum ada drama di favorit.";
    empty.style.display = favs.length ? "none" : "block";

    favs.forEach((b) => {
      const id = encodeURIComponent(String(b.bookId || ""));
      const name = encodeURIComponent(String(b.bookName || ""));
      const tags = Array.isArray(b.tags) ? b.tags.slice(0, 3).join(", ") : "";

      grid.appendChild(
        createAnimeCard(
          {
            title: b.bookName || "-",
            poster: b.coverWap || b.cover || "",
          },
          {
            badgeBottom: b.chapterCount ? `Eps ${b.chapterCount}` : "",
            meta: tags,
            href: `/drama/detail?bookId=${id}&name=${name}`,
            onClick: () => storeDramaBook(b),
          }
        )
      );
    });
  };

  const render = (type) => {
    if (!grid || !empty) return;
    setActiveTabUi(type);
    try {
      localStorage.setItem(LS_TAB, type);
    } catch {}
    type === "drama" ? renderDrama() : renderAnime();
  };

  document.addEventListener("DOMContentLoaded", () => {
    if (!grid || !empty) return;

    let type = "anime";
    try {
      const saved = (localStorage.getItem(LS_TAB) || "").toLowerCase();
      if (saved === "drama" || saved === "anime") type = saved;
      else if (typeof window.getAppMode === "function" && window.getAppMode() === "drama") type = "drama";
    } catch {}

    tabAnime &&
      (tabAnime.onclick = () => {
        render("anime");
      });

    tabDrama &&
      (tabDrama.onclick = () => {
        render("drama");
      });

    render(type);
  });
})();
