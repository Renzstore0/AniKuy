// assets/js/ongoing.js

const ongoingGridFull = document.getElementById("ongoingGridFull");
const ongoingPrevBtn = document.getElementById("ongoingPrevBtn");
const ongoingNextBtn = document.getElementById("ongoingNextBtn");
const ongoingPageInfo = document.getElementById("ongoingPageInfo");

let ongoingPage = 1;
let ongoingLastPage = 1;
let ongoingLoading = false;

// sembunyikan control pagination lama
if (ongoingPrevBtn) ongoingPrevBtn.style.display = "none";
if (ongoingNextBtn) ongoingNextBtn.style.display = "none";
if (ongoingPageInfo) ongoingPageInfo.style.display = "none";

async function loadOngoingList(page = 1, append = false) {
  if (!ongoingGridFull || ongoingLoading) return;

  ongoingLoading = true;

  let json;
  try {
    json = await apiGet(`/anime/ongoing-anime?page=${page}`);
  } catch {
    ongoingLoading = false;
    return;
  }

  if (!json || json.status !== "success") {
    ongoingLoading = false;
    return;
  }

  const pag = json.data.paginationData;
  ongoingPage = pag.current_page;
  ongoingLastPage = pag.last_visible_page || ongoingLastPage;

  // kalau bukan append, berarti load pertama / refresh
  if (!append) {
    ongoingGridFull.innerHTML = "";
  }

  (json.data.ongoingAnimeData || []).forEach((a) => {
    const episodeRaw = a.current_episode || "";
    const episodeShort =
      episodeRaw.replace(/^Episode\s*/i, "Eps ").trim() || "";

    const card = createAnimeCard(a, {
      badgeTop: a.release_day || "",
      badgeBottom: episodeShort,
      meta: a.newest_release_date || "",
    });
    ongoingGridFull.appendChild(card);
  });

  ongoingLoading = false;
}

// infinite scroll pakai mainContent
document.addEventListener("DOMContentLoaded", () => {
  loadOngoingList(1, false); // page 1

  const mainContent = document.getElementById("mainContent");
  if (!mainContent) return;

  mainContent.addEventListener("scroll", () => {
    const nearBottom =
      mainContent.scrollTop + mainContent.clientHeight >=
      mainContent.scrollHeight - 200; // 200px sebelum mentok

    if (
      nearBottom &&
      !ongoingLoading &&
      ongoingPage < ongoingLastPage
    ) {
      loadOngoingList(ongoingPage + 1, true); // append page berikutnya
    }
  });
});
