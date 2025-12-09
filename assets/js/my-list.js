const myListGrid = document.getElementById("myListGrid");
const myListEmpty = document.getElementById("myListEmpty");
const tabFavorites = document.getElementById("tabFavorites");
const tabHistory = document.getElementById("tabHistory");

function renderFavorites() {
  if (!myListGrid || !myListEmpty) return;

  const favs = getFavorites();
  myListGrid.innerHTML = "";

  if (!favs.length) {
    myListEmpty.style.display = "block";
    myListEmpty.textContent = "Belum ada anime di favorit.";
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

function formatSecondsToLabel(sec) {
  const s = Math.floor(Number(sec) || 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (!m && !r) return "";
  if (!m) return `${r}s`;
  return `${m}m ${r}s`;
}

function renderHistory() {
  if (!myListGrid || !myListEmpty) return;

  const histories =
    typeof getWatchHistory === "function" ? getWatchHistory() : [];
  myListGrid.innerHTML = "";

  if (!histories.length) {
    myListEmpty.style.display = "block";
    myListEmpty.textContent = "Belum ada riwayat tontonan.";
    return;
  }

  myListEmpty.style.display = "none";

  histories.forEach((h) => {
    const labelTime = formatSecondsToLabel(h.last_time);
    const meta =
      (h.episode_title ? `${h.episode_title} · ` : "") +
      (labelTime ? `Lanjut di ${labelTime}` : "Lanjut nonton");

    const card = createAnimeCard(
      {
        slug: h.anime_slug,
        title: h.anime_title || "",
        poster: h.anime_poster || "",
      },
      {
        meta,
        badgeBottom: "Lanjut nonton",
        href: `/anime/episode?slug=${encodeURIComponent(h.episode_slug)}`,
      }
    );

    myListGrid.appendChild(card);
  });
}

function setActiveTab(tab) {
  if (!tabFavorites || !tabHistory) return;
  if (tab === "history") {
    tabHistory.classList.add("active");
    tabFavorites.classList.remove("active");
    renderHistory();
  } else {
    tabFavorites.classList.add("active");
    tabHistory.classList.remove("active");
    renderFavorites();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // default: Favorit
  setActiveTab("favorites");

  if (tabFavorites) {
    tabFavorites.addEventListener("click", () => setActiveTab("favorites"));
  }
  if (tabHistory) {
    tabHistory.addEventListener("click", () => setActiveTab("history"));
  }
});
