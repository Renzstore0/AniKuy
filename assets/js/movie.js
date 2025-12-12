const movieGrid = document.getElementById("movieGrid");
const movieLoading = document.getElementById("movieLoading");
const movieEnd = document.getElementById("movieEnd");
const mainContent = document.getElementById("mainContent");

let moviePage = 1;
let movieHasNext = true;
let movieIsLoading = false;

function setMovieLoading(isLoading) {
  movieIsLoading = isLoading;
  if (movieLoading) movieLoading.classList.toggle("show", isLoading);
}

function setMovieEndVisible(show) {
  if (!movieEnd) return;
  movieEnd.classList.toggle("hidden", !show);
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
  if (!movieGrid || movieIsLoading || !movieHasNext) return;

  setMovieLoading(true);
  setMovieEndVisible(false);

  try {
    const json = await apiGet(
      `/anime/samehadaku/movies?page=${encodeURIComponent(page)}`
    );

    if (!json || json.status !== "success" || !json.data) {
      if (typeof showToast === "function") showToast("Gagal memuat movie");
      movieHasNext = false;
      setMovieEndVisible(true);
      return;
    }

    const list = Array.isArray(json.data.animeList) ? json.data.animeList : [];
    const pagination = json.pagination || null;

    // render cards
    list.forEach((a) => {
      const item = {
        title: a.title || "-",
        poster: a.poster || "",
        slug: a.animeId || parseAnimeIdFromHref(a.href) || "",
        animeId: a.animeId,
      };

      const card = createAnimeCard(item, {
        rating: a.score && a.score !== "" ? a.score : "N/A",
        meta: a.status || "",
      });

      movieGrid.appendChild(card);
    });

    // update pagination
    if (pagination && typeof pagination.hasNextPage === "boolean") {
      movieHasNext = pagination.hasNextPage;
    } else {
      // fallback: kalau pagination tidak ada, stop saat list kosong
      movieHasNext = list.length > 0;
    }

    if (!movieHasNext) setMovieEndVisible(true);
  } catch (e) {
    if (typeof showToast === "function") showToast("Gagal memuat movie");
  } finally {
    setMovieLoading(false);
  }
}

function shouldLoadNextByScroll(container) {
  // load next kalau sudah dekat bottom (threshold 280px)
  const threshold = 280;
  return (
    container.scrollTop + container.clientHeight >=
    container.scrollHeight - threshold
  );
}

function onMovieScroll() {
  if (!mainContent) return;
  if (movieIsLoading || !movieHasNext) return;

  if (shouldLoadNextByScroll(mainContent)) {
    moviePage += 1;
    loadMovies(moviePage);
  }
}

function initMoviePage() {
  if (!movieGrid) return;

  // support ?page=2 sebagai start (opsional)
  const params = new URLSearchParams(window.location.search);
  const p = parseInt(params.get("page") || "1", 10);
  moviePage = Number.isFinite(p) && p > 0 ? p : 1;

  movieGrid.innerHTML = "";
  movieHasNext = true;
  setMovieEndVisible(false);

  // load awal
  loadMovies(moviePage);

  // infinite scroll: listen scroll dari container utama (#mainContent)
  if (mainContent) {
    mainContent.addEventListener("scroll", onMovieScroll, { passive: true });
  }

  // cadangan: kalau konten awal pendek, auto fetch sampai bisa discroll / habis
  const pump = async () => {
    if (!mainContent) return;
    let guard = 0;
    while (
      guard < 6 &&
      movieHasNext &&
      !movieIsLoading &&
      mainContent.scrollHeight <= mainContent.clientHeight + 50
    ) {
      guard += 1;
      moviePage += 1;
      await loadMovies(moviePage);
    }
  };

  // jalankan pump setelah load awal selesai (kasih jeda kecil)
  setTimeout(pump, 300);
}

document.addEventListener("DOMContentLoaded", initMoviePage);
