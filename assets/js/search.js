// assets/js/search.js

const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const searchResultInfo = document.getElementById("searchResultInfo");
const searchResultGrid = document.getElementById("searchResultGrid");

async function performSearch(query) {
  if (!searchResultGrid || !searchResultInfo) return;
  if (!query) {
    showToast("Masukkan kata kunci");
    return;
  }

  const q = query.trim();
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

if (searchForm && searchInput) {
  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    performSearch(searchInput.value);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const q = params.get("q");
  if (q) {
    searchInput.value = q;
    performSearch(q);
  }
});
