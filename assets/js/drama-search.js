(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const form = $("dramaSearchForm");
  const input = $("dramaSearchInput");
  const info = $("dramaSearchInfo");
  const grid = $("dramaSearchGrid");

  let t;

  const storeBook = (b) => {
    try {
      if (!b?.bookId) return;
      sessionStorage.setItem(`dramabox_book_${b.bookId}`, JSON.stringify(b));
    } catch {}
  };

  const setUrlQ = (q) => {
    const p = new URLSearchParams(location.search);
    q ? p.set("q", q) : p.delete("q");
    const s = p.toString();
    history.replaceState({}, "", s ? `${location.pathname}?${s}` : location.pathname);
  };

  const clearResult = () => {
    grid && (grid.innerHTML = "");
    info && (info.textContent = "");
  };

  async function performSearch(q) {
    if (!grid || !info) return;
    q = (q || "").trim();
    if (!q) {
      clearResult();
      setUrlQ("");
      return;
    }

    let json;
    try {
      json = await apiGetDrama(`/api/dramabox/search?query=${encodeURIComponent(q)}`);
    } catch {
      return;
    }

    if (!Array.isArray(json)) return;

    grid.innerHTML = "";
    info.textContent = `${json.length} hasil untuk "${q}"`;

    json.forEach((b) => {
      const cover = b.coverWap || b.cover || "";
      const href = `/drama/detail?bookId=${encodeURIComponent(b.bookId || "")}&name=${encodeURIComponent(
        b.bookName || ""
      )}`;

      grid.appendChild(
        createAnimeCard(
          { title: b.bookName || "-", poster: cover },
          {
            meta: Array.isArray(b.tagNames) ? b.tagNames.slice(0, 3).join(", ") : "",
            badgeBottom: b.chapterCount ? `Eps ${b.chapterCount}` : "",
            href,
            onClick: () => storeBook(b),
          }
        )
      );
    });

    setUrlQ(q);
  }

  const onInput = () => {
    if (!input) return;
    const v = input.value.trim();
    if (!v) {
      clearResult();
      setUrlQ("");
      return;
    }
    if (v.length < 2) return;
    clearTimeout(t);
    t = setTimeout(() => performSearch(v), 400);
  };

  if (form && input) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      performSearch(input.value);
    });
    input.addEventListener("input", onInput);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const q = new URLSearchParams(location.search).get("q");
    if (q && input) {
      input.value = q;
      performSearch(q);
    }
  });
})();
