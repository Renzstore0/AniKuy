// assets/js/complete.js

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
    json = await apiGet(`/anime/complete-anime/${page}`);
  } catch {
    completeLoading = false;
    return;
  }

  if (!json || json.status !== "success") {
    completeLoading = false;
    return;
  }

  const pag = json.data.paginationData;
  completePage = pag.current_page;
  completeLastPage = pag.last_visible_page || completeLastPage;

  // kalau bukan append, berarti load pertama / refresh
  if (!append) {
    completeGridFull.innerHTML = "";
  }

  (json.data.completeAnimeData || []).forEach((a) => {
    const epsLabel = a.episode_count
      ? `Eps ${a.episode_count}`
      : "Eps ?";

    const card = createAnimeCard(a, {
      // tidak pakai rating di halaman "Semua Selesai"
      badgeBottom: epsLabel,
      meta: a.last_release_date || "",
    });
    completeGridFull.appendChild(card);
  });

  completeLoading = false;
}

// infinite scroll pakai mainContent
document.addEventListener("DOMContentLoaded", () => {
  loadCompleteList(1, false); // page 1

  const mainContent = document.getElementById("mainContent");
  if (!mainContent) return;

  mainContent.addEventListener("scroll", () => {
    const nearBottom =
      mainContent.scrollTop + mainContent.clientHeight >=
      mainContent.scrollHeight - 200;

    if (
      nearBottom &&
      !completeLoading &&
      completePage < completeLastPage
    ) {
      loadCompleteList(completePage + 1, true); // append page berikutnya
    }
  });
});
