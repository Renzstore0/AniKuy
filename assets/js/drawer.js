(() => {
  const drawer = document.getElementById("sideDrawer");
  const openBtn = document.getElementById("menuButton");
  const closeBtn = document.getElementById("drawerCloseBtn");
  const overlay = document.getElementById("drawerOverlay");

  if (!drawer || !openBtn || !closeBtn || !overlay) return;

  const open = () => {
    drawer.classList.add("show");
    drawer.setAttribute("aria-hidden", "false");
  };

  const close = () => {
    drawer.classList.remove("show");
    drawer.setAttribute("aria-hidden", "true");
  };

  openBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", close);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
})();
