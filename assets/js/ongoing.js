// assets/js/ongoing.js

const ongoingGridFull = document.getElementById("ongoingGridFull");
const ongoingPrevBtn = document.getElementById("ongoingPrevBtn");
const ongoingNextBtn = document.getElementById("ongoingNextBtn");
const ongoingPageInfo = document.getElementById("ongoingPageInfo");

let ongoingPage = 1;
let ongoingLastPage = 1;

async function loadOngoingList(page = 1) {
  if (!ongoingGridFull) return;

  let json;
  try {
    json = await apiGet(`/anime/ongoing-anime?page=${page}`);
  } catch {
    return;
  }
  if (!json || json.status !== "success") return;

  const pag = json.data.paginationData;
  ongoingPage = pag.current_page;
  ongoingLastPage = pag.last_visible_page || ongoingLastPage;

  ongoingGridFull.innerHTML = "";
  (json.data.ongoingAnimeData || []).forEach((a) => {
    const card = createAnimeCard(a, {
      badgeTop: a.release_day || "",
      badgeBottom: a.current_episode || "",
      meta: a.newest_release_date || "",
    });
    ongoingGridFull.appendChild(card);
  });

  if (ongoingPageInfo) {
    ongoingPageInfo.textContent = `Page ${ongoingPage} / ${ongoingLastPage}`;
  }
  if (ongoingPrevBtn) {
    ongoingPrevBtn.disabled = ongoingPage <= 1;
  }
  if (ongoingNextBtn) {
    ongoingNextBtn.disabled = !pag.has_next_page;
  }
}

if (ongoingNextBtn) {
  ongoingNextBtn.addEventListener("click", () => {
    if (ongoingPage < ongoingLastPage) {
      loadOngoingList(ongoingPage + 1);
    }
  });
}

if (ongoingPrevBtn) {
  ongoingPrevBtn.addEventListener("click", () => {
    if (ongoingPage > 1) {
      loadOngoingList(ongoingPage - 1);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadOngoingList(1);
});
