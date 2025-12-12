const completeGridFull = document.getElementById("completeGridFull");
const completePrevBtn = document.getElementById("completePrevBtn");
const completeNextBtn = document.getElementById("completeNextBtn");
const completePageInfo = document.getElementById("completePageInfo");

let completePage = 1;
let completeLastPage = 1;
let completeLoading = false;

// sembunyikan control pagination lama
if (completePrevBtn) completePrevBtn.style.display = "none";
if (completeNextBtn) completeNextBtn.style.display = "none";
if (completePageInfo) completePageInfo.style.display = "none";

async function loadCompleteList(page = 1, append = false) {
  if (!completeGridFull || completeLoading) return;

  completeLoading = true;

  let json;
  try {
    // ✅ ganti respon: completed Samehadaku
    json = await apiGet(`/anime/samehadaku/completed?page=${page}`);
  } catch {
    completeLoading = false;
    return;
  }

  if (!json || json.status !== "success") {
    completeLoading = false;
    return;
  }

  const pag = json.pagination || {};
  completePage = pag.currentPage || page;
  completeLastPage = pag.totalPages || completeLastPage;

  if (!append) completeGridFull.innerHTML = "";

  const list = json.data && Array.isArray(json.data.animeList) ? json.data.animeList : [];

  list.forEach((a) => {
    const item = {
      title: a.title,
      poster: a.poster,
      slug: a.slug,
    };

    // episode_count tidak selalu ada di response list completed
    const epsRaw = a.episode_count || a.episodes || "";
    const epsLabel = epsRaw ? `Eps ${epsRaw}` : "Eps ?";

    // genreList (kalau ada) untuk meta
    const genres = Array.isArray(a.genreList)
      ? a.genreList.map((g) => (g && (g.title || g.name))).filter(Boolean).join(", ")
      : "";

    const card = createAnimeCard(item, {
      badgeBottom: epsLabel,
      meta: genres || a.status || "",
    });
    completeGridFull.appendChild(card);
  });

  completeLoading = false;
}

// infinite scroll pakai mainContent
document.addEventListener("DOMContentLoaded", () => {
  loadCompleteList(1, false);

  const mainContent = document.getElementById("mainContent");
  if (!mainContent) return;

  mainContent.addEventListener("scroll", () => {
    const nearBottom =
      mainContent.scrollTop + mainContent.clientHeight >=
      mainContent.scrollHeight - 200;

    if (nearBottom && !completeLoading && completePage < completeLastPage) {
      loadCompleteList(completePage + 1, true);
    }
  });
});
