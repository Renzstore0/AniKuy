// assets/js/ongoing.js
(() => {
  "use strict";

  const grid = document.getElementById("ongoingGridFull");
  const main = document.getElementById("mainContent");

  let page = 1,
    last = 1,
    loading = false;

  // tombol/info pagination memang tidak dipakai
  ["ongoingPrevBtn", "ongoingNextBtn", "ongoingPageInfo"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });

  const epsLabel = (txt) => {
    const t = String(txt || "").trim();
    const m =
      t.match(/^Total\s+(\d+)/i) ||
      t.match(/^Episode\s+(\d+)/i) ||
      t.match(/^(\d+)\s*(Episode|Eps?)?$/i);
    return m ? `Eps ${m[1]}` : t.replace(/Episode/gi, "Eps");
  };

  const slugFromHref = (href) => {
    try {
      const parts = String(href || "").trim().split("/").filter(Boolean);
      return parts.pop() || "";
    } catch {
      return "";
    }
  };

  async function load(p = 1, append = false) {
    if (!grid || loading) return;
    loading = true;

    let json;
    try {
      json = await apiGet(`/anime/samehadaku/recent?page=${encodeURIComponent(p)}`);
    } catch {
      loading = false;
      return;
    }

    if (json?.status !== "success") return void (loading = false);

    const pag = json.pagination || {};
    page = pag.currentPage || p;
    last = pag.totalPages || last;

    if (!append) grid.innerHTML = "";

    const list = Array.isArray(json?.data?.animeList) ? json.data.animeList : [];
    for (const a of list) {
      const slug = a?.animeId || slugFromHref(a?.href) || a?.slug || "";
      const card = createAnimeCard(
        { title: a?.title || "-", poster: a?.poster || "", slug, animeId: a?.animeId },
        { badgeTop: "Baru", badgeBottom: epsLabel(a?.episodes), meta: a?.releasedOn || "" }
      );
      grid.appendChild(card);
    }

    loading = false;
  }

  document.addEventListener("DOMContentLoaded", () => {
    load(1, false);
    if (!main) return;

    main.addEventListener("scroll", () => {
      const nearBottom = main.scrollTop + main.clientHeight >= main.scrollHeight - 200;
      if (nearBottom && !loading && page < last) load(page + 1, true);
    });
  });
})();
