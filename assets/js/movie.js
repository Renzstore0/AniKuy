const movieGrid = document.getElementById("movieGrid");
const movieLoading = document.getElementById("movieLoading");
const movieLoadMoreBtn = document.getElementById("movieLoadMoreBtn");

let moviePage = 1;
let movieHasNext = true;
let movieIsLoading = false;

function setMovieLoading(isLoading) {
  movieIsLoading = isLoading;
  if (movieLoading) movieLoading.style.display = isLoading ? "block" : "none";
  if (movieLoadMoreBtn) movieLoadMoreBtn.disabled = isLoading;
}

function parseAnimeIdFromHref(href) {
  if (!href) return "";
  try {
    const s = String(href).trim();
    const parts = s.split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  } catch {
    return "";
  }
}

async function loadMovies(page = 1) {
  if (!movieGrid || movieIsLoading) return;

  setMovieLoading(true);

  try {
    const json = await apiGet(`/anime/samehadaku/movies?page=${encodeURIComponent(page)}`);
    if (!json || json.status !== "success" || !json.data) {
      if (typeof showToast === "function") showToast("Gagal memuat movie");
      return;
    }

    const list = Array.isArray(json.data.animeList) ? json.data.animeList : [];
    const pagination = json.pagination || null;

    list.forEach((a) => {
      const item = {
        title: a.title || "-",
        poster: a.poster || "",
        slug: a.animeId || parseAnimeIdFromHref(a.href) || "",
        animeId: a.animeId,
      };

      const card = createAnimeCard(item, {
        rating: a.score && a.score !== "" ? a.score : "N/A",
        meta: a.releaseDate ? a.releaseDate : (a.status || ""),
      });

      movieGrid.appendChild(card);
    });

    if (pagination && typeof pagination.hasNextPage === "boolean") {
      movieHasNext = pagination.hasNextPage;
    } else {
      // kalau pagination tidak ada, anggap selesai kalau list kosong
      movieHasNext = list.length > 0;
    }

    if (movieLoadMoreBtn) {
      movieLoadMoreBtn.style.display = movieHasNext ? "inline-flex" : "none";
    }
  } catch (e) {
    if (typeof showToast === "function") showToast("Gagal memuat movie");
  } finally {
    setMovieLoading(false);
  }
}

function initMoviePage() {
  if (!movieGrid) return;

  // kalau mau support ?page=2
  const params = new URLSearchParams(window.location.search);
  const p = parseInt(params.get("page") || "1", 10);
  moviePage = Number.isFinite(p) && p > 0 ? p : 1;

  movieGrid.innerHTML = "";
  loadMovies(moviePage);

  if (movieLoadMoreBtn) {
    movieLoadMoreBtn.addEventListener("click", () => {
      if (!movieHasNext || movieIsLoading) return;
      moviePage += 1;
      loadMovies(moviePage);
    });
  }
}

document.addEventListener("DOMContentLoaded", initMoviePage);
