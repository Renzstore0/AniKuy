(() => {
  const page = document.body?.dataset?.page || "";
  if (page !== "home") return; // drawer hanya di home

  const btn = document.getElementById("backButton"); // dipakai jadi tombol hamburger
  const drawer = document.getElementById("sideDrawer");
  const overlay = document.getElementById("drawerOverlay");
  const closeBtn = document.getElementById("drawerClose");

  if (!btn || !drawer || !overlay) return;

  const open = () => {
    drawer.classList.add("show");
    overlay.hidden = false;
    overlay.classList.add("show");
    drawer.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("drawer-open");
    document.body.classList.add("drawer-open");
  };

  const close = () => {
    drawer.classList.remove("show");
    overlay.classList.remove("show");
    drawer.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("drawer-open");
    document.body.classList.remove("drawer-open");
    setTimeout(() => (overlay.hidden = true), 170);
  };

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    drawer.classList.contains("show") ? close() : open();
  });

  overlay.addEventListener("click", close);
  closeBtn && closeBtn.addEventListener("click", close);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawer.classList.contains("show")) close();
  });

  drawer.addEventListener("click", (e) => e.stopPropagation());
})();
