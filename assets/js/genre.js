const genreTitle = document.getElementById("genreTitle");
const genreAnimeGrid = document.getElementById("genreAnimeGrid");
const genrePrevBtn = document.getElementById("genrePrevBtn");
const genreNextBtn = document.getElementById("genreNextBtn");
const genrePageInfo = document.getElementById("genrePageInfo");

const urlParams = new URLSearchParams(window.location.search);
const currentGenreSlug = urlParams.get("slug");
const currentGenreName = urlParams.get("name");

// baca page dari query (?page=3), default 1
const initialGenrePage =
  parseInt(urlParams.get("page") || "1", 10) > 0
    ? parseInt(urlParams.get("page") || "1", 10)
    : 1;

let currentGenrePage = initialGenrePage;
let currentGenreLastPage = 1;

async function loadGenreList(page = 1) {
  if (!currentGenreSlug || !genreAnimeGrid) return;

  let json;
  try {
    json = await apiGet(`/anime/genre/${currentGenreSlug}?page=${page}`);
  } catch {
    return;
  }
  if (!json || json.status !== "success") return;

  const pag = json.data.pagination;
  currentGenrePage = pag.current_page;
  currentGenreLastPage = pag.last_visible_page || currentGenreLastPage;

  genreAnimeGrid.innerHTML = "";
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
  if (genrePrevBtn) {
    genrePrevBtn.disabled = currentGenrePage <= 1;
  }
  if (genreNextBtn) {
    genreNextBtn.disabled = !pag.has_next_page;
  }

  // update query page (replaceState saja biar nggak numpuk history)
  const params = new URLSearchParams(window.location.search);
  params.set("page", String(currentGenrePage));
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, "", newUrl);
}

if (genreNextBtn) {
  genreNextBtn.addEventListener("click", () => {
    if (currentGenrePage < currentGenreLastPage) {
      loadGenreList(currentGenrePage + 1);
    }
  });
}

if (genrePrevBtn) {
  genrePrevBtn.addEventListener("click", () => {
    if (currentGenrePage > 1) {
      loadGenreList(currentGenrePage - 1);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (genreTitle) {
    genreTitle.textContent = currentGenreName || "Genre";
  }
  loadGenreList(currentGenrePage);
});
