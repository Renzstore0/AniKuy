// assets/js/complete.js

const completeGridFull = document.getElementById("completeGridFull");
const completePrevBtn = document.getElementById("completePrevBtn");
const completeNextBtn = document.getElementById("completeNextBtn");
const completePageInfo = document.getElementById("completePageInfo");

let completePage = 1;
let completeLastPage = 1;

async function loadCompleteList(page = 1) {
  if (!completeGridFull) return;

  let json;
  try {
    json = await apiGet(`/anime/complete-anime/${page}`);
  } catch {
    return;
  }
  if (!json || json.status !== "success") return;

  const pag = json.data.paginationData;
  completePage = pag.current_page;
  completeLastPage = pag.last_visible_page || completeLastPage;

  completeGridFull.innerHTML = "";
  (json.data.completeAnimeData || []).forEach((a) => {
    const card = createAnimeCard(a, {
      rating: a.rating && a.rating !== "" ? a.rating : "N/A",
      badgeBottom: `${a.episode_count || "?"} Eps`,
      meta: a.last_release_date || "",
    });
    completeGridFull.appendChild(card);
  });

  if (completePageInfo) {
    completePageInfo.textContent = `Page ${completePage} / ${completeLastPage}`;
  }
  if (completePrevBtn) {
    completePrevBtn.disabled = completePage <= 1;
  }
  if (completeNextBtn) {
    completeNextBtn.disabled = !pag.has_next_page;
  }
}

if (completeNextBtn) {
  completeNextBtn.addEventListener("click", () => {
    if (completePage < completeLastPage) {
      loadCompleteList(completePage + 1);
    }
  });
}

if (completePrevBtn) {
  completePrevBtn.addEventListener("click", () => {
    if (completePage > 1) {
      loadCompleteList(completePage - 1);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadCompleteList(1);
});
