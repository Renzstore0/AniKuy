// assets/js/home.js

const ongoingGridHome = document.getElementById("ongoingGridHome");
const completeRowHome = document.getElementById("completeRowHome");
const seeAllOngoingBtn = document.getElementById("seeAllOngoingBtn");
const seeAllCompleteBtn = document.getElementById("seeAllCompleteBtn");

async function loadHome() {
  if (!ongoingGridHome || !completeRowHome) return;

  let data;
  try {
    data = await apiGet("/anime/home");
  } catch {
    return;
  }

  if (!data || data.status !== "success") {
    showToast("Data home tidak valid");
    return;
  }

  const ongoing = data.data.ongoing_anime || [];
  const complete = data.data.complete_anime || [];

  ongoingGridHome.innerHTML = "";
  completeRowHome.innerHTML = "";

  ongoing.slice(0, 9).forEach((a) => {
    const card = createAnimeCard(a, {
      badgeTop: "Baru",
      badgeBottom: a.current_episode || "",
      meta: a.release_day || "",
    });
    ongoingGridHome.appendChild(card);
  });

  complete.slice(0, 15).forEach((a) => {
    const card = createAnimeCard(a, {
      rating: a.rating && a.rating !== "" ? a.rating : "N/A",
      badgeBottom: `${a.episode_count || "?"} Eps`,
      meta: a.last_release_date || "",
    });
    completeRowHome.appendChild(card);
  });
}

if (seeAllOngoingBtn) {
  seeAllOngoingBtn.addEventListener("click", () => {
    window.location.href = "/anime/ongoing";
  });
}

if (seeAllCompleteBtn) {
  seeAllCompleteBtn.addEventListener("click", () => {
    window.location.href = "/anime/complete";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadHome();
});
