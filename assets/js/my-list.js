// assets/js/my-list.js

const myListGrid = document.getElementById("myListGrid");
const myListEmpty = document.getElementById("myListEmpty");

function renderMyListPage() {
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

document.addEventListener("DOMContentLoaded", () => {
  renderMyListPage();
});
