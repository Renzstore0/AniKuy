const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const searchResultInfo = document.getElementById("searchResultInfo");
const searchResultGrid = document.getElementById("searchResultGrid");

let searchDebounceTimer = null;

async function performSearch(query) {
  if (!searchResultGrid || !searchResultInfo) return;

  if (!query) {
    // kalau dipanggil dengan query kosong, clear aja
    searchResultGrid.innerHTML = "";
    searchResultInfo.textContent = "";
    const params = new URLSearchParams(window.location.search);
    params.delete("q");
    const qs = params.toString();
    const newUrl = qs
      ? `${window.location.pathname}?${qs}`
      : window.location.pathname;
    window.history.replaceState({}, "", newUrl);
    return;
  }

  const q = query.trim();
  if (!q) {
    searchResultGrid.innerHTML = "";
    searchResultInfo.textContent = "";
    return;
  }

  const enc = encodeURIComponent(q);

  let json;
  try {
    json = await apiGet(`/anime/search/${enc}`);
  } catch {
    return;
  }
  if (!json || json.status !== "success") return;

  const list = json.data || [];
  searchResultGrid.innerHTML = "";
  searchResultInfo.textContent = `${list.length} hasil untuk "${q}"`;

  list.forEach((a) => {
    const card = createAnimeCard(a, {
      rating: a.rating && a.rating !== "" ? a.rating : "N/A",
      badgeBottom: a.status || "",
      meta: (a.genres && a.genres.map((g) => g.name).join(", ")) || "",
    });
    searchResultGrid.appendChild(card);
  });

  // simpan query di URL
  const params = new URLSearchParams(window.location.search);
  params.set("q", q);
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, "", newUrl);
}

// live search saat user ngetik
function handleSearchInput() {
  if (!searchInput) return;
  const value = searchInput.value.trim();

  // kalau kosong: clear hasil + URL
  if (!value) {
    if (searchResultGrid) searchResultGrid.innerHTML = "";
    if (searchResultInfo) searchResultInfo.textContent = "";
    const params = new URLSearchParams(window.location.search);
    params.delete("q");
    const qs = params.toString();
    const newUrl = qs
      ? `${window.location.pathname}?${qs}`
      : window.location.pathname;
    window.history.replaceState({}, "", newUrl);
    return;
  }

  // minimal 2 karakter biar nggak terlalu spam API
  if (value.length < 2) {
    return;
  }

  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    performSearch(value);
  }, 400); // debounce 400ms
}

if (searchForm && searchInput) {
  // submit manual (enter / klik tombol)
  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    performSearch(searchInput.value);
  });

  // input event untuk auto search
  searchInput.addEventListener("input", handleSearchInput);
}

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const q = params.get("q");
  if (q && searchInput) {
    searchInput.value = q;
    performSearch(q);
  }
});
