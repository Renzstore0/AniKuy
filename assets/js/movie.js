const movieGrid = document.getElementById("movieGrid");
const movieLoadingEl = document.getElementById("movieLoading");
const movieEnd = document.getElementById("movieEnd");

let moviePage = 1;
let movieLastPage = 1;
let movieLoading = false;

function setMovieLoading(show) {
  if (!movieLoadingEl) return;
  movieLoadingEl.classList.toggle("show", !!show);
}

function setMovieEndVisible(show) {
  if (!movieEnd) return;
  movieEnd.classList.toggle("hidden", !show);
}

async function loadMovieList(page = 1, append = false) {
  if (!movieGrid || movieLoading) return;

  movieLoading = true;
  setMovieLoading(true);
  setMovieEndVisible(false);

  let json;
  try {
    json = await apiGet(`/anime/samehadaku/movies?page=${encodeURIComponent(page)}`);
  } catch {
    movieLoading = false;
    setMovieLoading(false);
    return;
  }

  if (!json || json.status !== "success") {
    movieLoading = false;
    setMovieLoading(false);
    return;
  }

  // pagination bisa ada di root (sesuai contoh raw JSON kamu)
  const pag = json.pagination || {};
  moviePage = pag.currentPage || page;
  movieLastPage = pag.totalPages || movieLastPage;

  if (!append) movieGrid.innerHTML = "";

  const list =
    json.data && Array.isArray(json.data.animeList) ? json.data.animeList : [];

  list.forEach((a) => {
    const item = {
      title: a.title || "-",
      poster: a.poster || "",
      slug: a.animeId || "", // movie endpoint: animeId = slug detail
    };

    const card = createAnimeCard(item, {
      rating: a.score && a.score !== "" ? a.score : "N/A",
      meta: a.status || "",
    });

    movieGrid.appendChild(card);
  });

  // kalau sudah page terakhir, tampilkan end text
  if (moviePage >= movieLastPage) {
    setMovieEndVisible(true);
  }

  movieLoading = false;
  setMovieLoading(false);
}

document.addEventListener("DOMContentLoaded", () => {
  loadMovieList(1, false);

  const mainContent = document.getElementById("mainContent");
  if (!mainContent) return;

  mainContent.addEventListener("scroll", () => {
    const nearBottom =
      mainContent.scrollTop + mainContent.clientHeight >=
      mainContent.scrollHeight - 200;

    if (nearBottom && !movieLoading && moviePage < movieLastPage) {
      loadMovieList(moviePage + 1, true);
    }
  });
});
