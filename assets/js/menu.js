(() => {
  const page = document.body?.dataset?.page || "";
  const active = page === "drama" ? "drama" : page === "home" ? "anime" : "";
  if (!active) return;

  const btn = document.getElementById("backButton");
  if (!btn) return;

  // ubah ikon jadi hamburger
  const svg = btn.querySelector("svg");
  if (svg) {
    svg.innerHTML =
      '<path fill="currentColor" d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z"/>';
  }

  btn.classList.add("menu-btn");
  btn.dataset.menu = active;

  // pastikan overlay ada
  let overlay = document.getElementById("drawerOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "drawerOverlay";
    overlay.className = "drawer-overlay";
    overlay.hidden = true;
    document.body.appendChild(overlay);
  }

  // pastikan drawer ada
  let drawer = document.getElementById("sideDrawer");
  if (!drawer) {
    drawer = document.createElement("aside");
    drawer.id = "sideDrawer";
    drawer.className = "side-drawer";
    drawer.setAttribute("aria-hidden", "true");
    document.body.appendChild(drawer);
  }

  // paksa isi drawer biar konsisten (2 tombol kategori)
  drawer.dataset.active = active;
  drawer.innerHTML = `
    <div class="side-drawer-head">
      <div>
        <div class="side-drawer-title">AniKuy</div>
        <div class="side-drawer-sub">Pilih kategori</div>
      </div>
      <button id="drawerClose" class="icon-button" type="button" aria-label="Tutup">✕</button>
    </div>
    <div class="side-drawer-links">
      <a class="side-drawer-link ${active === "anime" ? "active" : ""}" href="/">Anime</a>
      <a class="side-drawer-link ${active === "drama" ? "active" : ""}" href="/drama/index.html">Short Drama</a>
    </div>
  `;

  const closeBtn = drawer.querySelector("#drawerClose");

  const open = () => {
    drawer.classList.add("show");
    overlay.hidden = false;
    overlay.classList.add("show");
    drawer.setAttribute("aria-hidden", "false");
  };

  const close = () => {
    drawer.classList.remove("show");
    overlay.classList.remove("show");
    drawer.setAttribute("aria-hidden", "true");
    setTimeout(() => (overlay.hidden = true), 170);
  };

  // CAPTURE + stopImmediatePropagation: biar ga bentrok sama core.js (back)
  btn.addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      drawer.classList.contains("show") ? close() : open();
    },
    true
  );

  overlay.addEventListener("click", close);
  closeBtn && closeBtn.addEventListener("click", close);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawer.classList.contains("show")) close();
  });

  drawer.addEventListener("click", (e) => e.stopPropagation());
})();
