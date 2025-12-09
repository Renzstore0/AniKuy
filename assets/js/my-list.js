const myListGrid = document.getElementById("myListGrid");
const myListEmpty = document.getElementById("myListEmpty");

const tabFavorites = document.getElementById("tabFavorites");
const tabHistory = document.getElementById("tabHistory");

let currentMyListTab = "favorites"; // "favorites" | "history"

function setActiveTab(tab) {
  currentMyListTab = tab;

  if (tabFavorites) {
    tabFavorites.classList.toggle("active", tab === "favorites");
    tabFavorites.textContent = "Favorit";
  }
  if (tabHistory) {
    tabHistory.classList.toggle("active", tab === "history");
    tabHistory.textContent = "History";
  }

  renderMyListPage();
}

function renderFavoritesList() {
  if (!myListGrid || !myListEmpty) return;

  const favs = getFavorites();
  myListGrid.innerHTML = "";

  if (!favs.length) {
    myListEmpty.style.display = "block";
    return;
  }

  myListEmpty.style.display = "none";

  favs.forEach((a) => {
    const card = createAnimeCard(a, {
      rating: a.rating || "",
      badgeBottom: a.episode_count ? `${a.episode_count} Eps` : "",
      meta: a.status || "",
    });
    myListGrid.appendChild(card);
  });
}

function renderHistoryList() {
  if (!myListGrid || !myListEmpty) return;

  const historyMap =
    typeof getWatchHistory === "function" ? getWatchHistory() : {};

  const entries = Object.values(historyMap || {}).sort((a, b) => {
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });

  myListGrid.innerHTML = "";

  if (!entries.length) {
    myListEmpty.style.display = "block";
    return;
  }

  myListEmpty.style.display = "none";

  entries.forEach((h) => {
    const pos = Number(h.positionSec || 0);
    const minutes = Math.floor(pos / 60);
    const seconds = pos % 60;
    const timeLabel =
      pos > 0
        ? ` • ${minutes.toString().padStart(2, "0")}:${seconds
            .toString()
            .padStart(2, "0")}`
        : "";

    const item = {
      slug: h.animeSlug,
      title: h.animeTitle || h.episodeTitle || "Episode",
      poster: h.poster || "",
      status: "",
      episode_count: "",
      rating: "",
    };

    const card = createAnimeCard(item, {
      rating: "",
      badgeBottom: h.episodeTitle ? h.episodeTitle : "",
      meta: `Lanjut nonton${timeLabel}`,
    });

    // override klik card → langsung ke episode terakhir
    card.addEventListener(
      "click",
      (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (!h.episodeSlug) {
          showToast("Episode tidak ditemukan");
          return;
        }
        const url = `/anime/episode?slug=${encodeURIComponent(h.episodeSlug)}`;
        window.location.href = url;
      },
      true // capture: true, biar nutup handler bawaan card
    );

    myListGrid.appendChild(card);
  });
}

function renderMyListPage() {
  if (currentMyListTab === "history") {
    renderHistoryList();
  } else {
    renderFavoritesList();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (tabFavorites) {
    tabFavorites.addEventListener("click", () => setActiveTab("favorites"));
  }
  if (tabHistory) {
    tabHistory.addEventListener("click", () => setActiveTab("history"));
  }

  // default buka tab Favorit
  setActiveTab("favorites");
});
