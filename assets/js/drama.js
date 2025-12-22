(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const toast = (m) => typeof showToast === "function" && showToast(m);

  const el = {
    loading: $("dramaLoading"),
    foryou: $("dramaForYouRow"),
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

  const renderRow = (container, list) => {
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

  async function loadOne(path, container) {
    try {
      const j = await apiGetDrama(path);
      if (!Array.isArray(j)) return [];
      renderRow(container, j);
      return j;
    } catch {
      return [];
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    el.loading && el.loading.classList.add("show");

    await loadOne("/api/dramabox/foryou", el.foryou);
    await loadOne("/api/dramabox/trending", el.trending);
    await loadOne("/api/dramabox/latest", el.latest);
    await loadOne("/api/dramabox/populersearch", el.popular);

    el.loading && el.loading.classList.remove("show");
    toast("Drama siap!");
  });
})();
