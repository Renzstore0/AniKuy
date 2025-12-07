// assets/js/genre.js

const genreTitle = document.getElementById("genreTitle");
const genreAnimeGrid = document.getElementById("genreAnimeGrid");
const genrePrevBtn = document.getElementById("genrePrevBtn");
const genreNextBtn = document.getElementById("genreNextBtn");
const genrePageInfo = document.getElementById("genrePageInfo");

// container scroll utama (di layout kamu ini #mainContent)
const genreScrollContainer =
  document.getElementById("mainContent") || window;

const urlParams = new URLSearchParams(window.location.search);
const currentGenreSlug = urlParams.get("slug");
const currentGenreName = urlParams.get("name");

let currentGenrePage = 1;
let currentGenreLastPage = 1;
let genreHasMore = true;
let genreIsLoading = false;

const GENRE_SCROLL_OFFSET = 400; // jarak 400px sebelum mentok bawah

async function loadGenreList(page = 1) {
  if (!currentGenreSlug || !genreAnimeGrid) return;
  if (genreIsLoading) return;
  if (!genreHasMore && page > 1) return;

  genreIsLoading = true;

  // kalau pertama kali load, kosongkan grid
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

  let scrollTop, scrollHeight, clientHeight;

  if (genreScrollContainer === window) {
    const doc = document.documentElement;
    scrollTop = window.scrollY || doc.scrollTop;
    scrollHeight = doc.scrollHeight;
    clientHeight = window.innerHeight;
  } else {
    scrollTop = genreScrollContainer.scrollTop;
    scrollHeight = genreScrollContainer.scrollHeight;
    clientHeight = genreScrollContainer.clientHeight;
  }

  if (scrollTop + clientHeight >= scrollHeight - GENRE_SCROLL_OFFSET) {
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

  if (genreScrollContainer === window) {
    window.addEventListener("scroll", handleGenreInfiniteScroll, {
      passive: true,
    });
  } else {
    genreScrollContainer.addEventListener(
      "scroll",
      handleGenreInfiniteScroll,
      { passive: true }
    );
  }
});
