// assets/js/ongoing.js

const ongoingGridFull = document.getElementById("ongoingGridFull");
const ongoingPrevBtn = document.getElementById("ongoingPrevBtn");
const ongoingNextBtn = document.getElementById("ongoingNextBtn");
const ongoingPageInfo = document.getElementById("ongoingPageInfo");

let ongoingPage = 1;
let ongoingLastPage = 1;
let ongoingLoading = false;

// sembunyikan kontrol pagination lama
if (ongoingPrevBtn) ongoingPrevBtn.style.display = "none";
if (ongoingNextBtn) ongoingNextBtn.style.display = "none";
if (ongoingPageInfo) ongoingPageInfo.style.display = "none";

// format label episode jadi "Eps .."
function formatEpisodeLabel(text) {
  if (!text) return "";

  let t = String(text).trim();

  // "Total 10 Episode" / "Total 10 Eps"
  let m = t.match(/^Total\s+(\d+)\s*(Episode|Eps?)?/i);
  if (m) return `Eps ${m[1]}`;

  // "Episode 10"
  m = t.match(/^Episode\s+(\d+)/i);
  if (m) return `Eps ${m[1]}`;

  // "10 Episode" / "10 Eps" / "10"
  m = t.match(/^(\d+)\s*(Episode|Eps?)?$/i);
  if (m) return `Eps ${m[1]}`;

  // fallback
  return t.replace(/Episode/gi, "Eps");
}

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

  if (!append) {
    ongoingGridFull.innerHTML = "";
  }

  (json.data.ongoingAnimeData || []).forEach((a) => {
    const card = createAnimeCard(a, {
      badgeTop: a.release_day || "",
      badgeBottom: formatEpisodeLabel(a.current_episode || ""),
      meta: a.newest_release_date || "",
    });
    ongoingGridFull.appendChild(card);
  });

  ongoingLoading = false;
}

// infinite scroll pakai mainContent
document.addEventListener("DOMContentLoaded", () => {
  loadOngoingList(1, false);

  const mainContent = document.getElementById("mainContent");
  if (!mainContent) return;

  mainContent.addEventListener("scroll", () => {
    const nearBottom =
      mainContent.scrollTop + mainContent.clientHeight >=
      mainContent.scrollHeight - 200;

    if (
      nearBottom &&
      !ongoingLoading &&
      ongoingPage < ongoingLastPage
    ) {
      loadOngoingList(ongoingPage + 1, true);
    }
  });
});
