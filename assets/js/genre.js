// assets/js/genre.js

const genreTitle = document.getElementById("genreTitle");
const genreAnimeGrid = document.getElementById("genreAnimeGrid");
const genrePrevBtn = document.getElementById("genrePrevBtn");
const genreNextBtn = document.getElementById("genreNextBtn");
const genrePageInfo = document.getElementById("genrePageInfo");

const urlParams = new URLSearchParams(window.location.search);
const currentGenreSlug = urlParams.get("slug");
const currentGenreName = urlParams.get("name");

let currentGenrePage = 1;
let currentGenreLastPage = 1;
let genreHasMore = true;
let genreIsLoading = false;
const GENRE_SCROLL_OFFSET = 400; // jarak 400px dari bawah sebelum load berikutnya

async function loadGenreList(page = 1) {
  if (!currentGenreSlug || !genreAnimeGrid) return;
  if (genreIsLoading) return;
  if (!genreHasMore && page > 1) return;

  genreIsLoading = true;

  // kalau page 1, kosongkan grid dulu
  if (page === 1) {
    genreAnimeGrid.innerHTML = "";
  }

  let json;
  try {
    json = await apiGet(`/anime/genre/${currentGenreSlug}?page=${page}`);
  } catch {
    genreIsLoading = false;
    return;
  }
  if (!json || json.status !== "success") {
    genreIsLoading = false;
    return;
  }

  const pag = json.data.pagination || {};
  currentGenrePage = pag.current_page || page;
  currentGenreLastPage =
    pag.last_visible_page || currentGenreLastPage || currentGenrePage;

  // masih ada page berikutnya?
  genreHasMore =
    pag.has_next_page === true || currentGenrePage < currentGenreLastPage;

  (json.data.anime || []).forEach((a) => {
    const card = createAnimeCard(a, {
      rating: a.rating && a.rating !== "" ? a.rating : "N/A",
      badgeBottom: a.episode_count ? `${a.episode_count} Eps` : "",
      meta: a.season || "",
    });
    genreAnimeGrid.appendChild(card);
  });

  if (genrePageInfo) {
    genrePageInfo.textContent = `Page ${currentGenrePage} / ${currentGenreLastPage}`;
  }

  genreIsLoading = false;
}

// handler infinite scroll
function handleGenreInfiniteScroll() {
  if (!genreHasMore || genreIsLoading) return;

  const scrollPos = window.innerHeight + window.scrollY;
  const threshold = document.body.offsetHeight - GENRE_SCROLL_OFFSET;

  if (scrollPos >= threshold) {
    loadGenreList(currentGenrePage + 1);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (genreTitle) {
    genreTitle.textContent = currentGenreName || "Genre";
  }

  // sembunyikan tombol Back / Next kalau masih ada di HTML
  if (genrePrevBtn) genrePrevBtn.style.display = "none";
  if (genreNextBtn) genreNextBtn.style.display = "none";

  loadGenreList(1);
  window.addEventListener("scroll", handleGenreInfiniteScroll, {
    passive: true,
  });
});
