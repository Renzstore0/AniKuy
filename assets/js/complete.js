// assets/js/complete.js
(() => {
  const grid = document.getElementById("completeGridFull"),
    main = document.getElementById("mainContent"),
    hide = (id) => (document.getElementById(id)?.style.setProperty("display", "none"));

  if (!grid) return;

  ["completePrevBtn", "completeNextBtn", "completePageInfo"].forEach(hide);

  let page = 1,
    last = 1,
    loading = false;

  const genresText = (g) =>
    Array.isArray(g) ? g.map((x) => x?.title || x?.name).filter(Boolean).join(", ") : "";

  async function load(p = 1, append = false) {
    if (loading) return;
    loading = true;

    try {
      const j = await apiGet(`/anime/samehadaku/completed?page=${encodeURIComponent(p)}`);
      if (j?.status !== "success") return;

      const pg = j.pagination || {};
      page = pg.currentPage || p;
      last = pg.totalPages || last;

      if (!append) grid.innerHTML = "";
      (j?.data?.animeList || []).forEach((a) => {
        const eps = a.episode_count || a.episodes || "";
        grid.appendChild(
          createAnimeCard(
            { title: a.title || "-", poster: a.poster || "", slug: a.slug || a.animeId || "" },
            { badgeBottom: `Eps ${eps || "?"}`, meta: genresText(a.genreList) || a.status || "" }
          )
        );
      });
    } catch {} 
    finally {
      loading = false;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    load(1);
    if (!main) return;
    main.addEventListener(
      "scroll",
      () =>
        main.scrollTop + main.clientHeight >= main.scrollHeight - 200 &&
        !loading &&
        page < last &&
        load(page + 1, true),
      { passive: true }
    );
  });
})();
