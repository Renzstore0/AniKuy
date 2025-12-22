(() => {
  const page = document.body?.dataset?.page || "";
  const section = page === "drama" ? "drama" : page === "home" ? "anime" : "";
  if (!section) return;

  // inject style kecil untuk: tombol hamburger beda warna + menu active beda warna
  if (!document.getElementById("menuDynamicStyle")) {
    const s = document.createElement("style");
    s.id = "menuDynamicStyle";
    s.textContent = `
      .icon-button.menu-btn{touch-action:manipulation;-webkit-tap-highlight-color:transparent}
      .icon-button.menu-btn[data-menu="anime"]{background:linear-gradient(135deg,#1d4ed8,#22d3ee)!important}
      .icon-button.menu-btn[data-menu="drama"]{background:linear-gradient(135deg,#a855f7,#22d3ee)!important}
      .side-drawer[data-active="anime"] .side-drawer-link.active{background:linear-gradient(135deg,#1d4ed8,#22d3ee);color:#e5f0ff}
      .side-drawer[data-active="drama"] .side-drawer-link.active{background:linear-gradient(135deg,#a855f7,#22d3ee);color:#e5f0ff}
    `;
    document.head.appendChild(s);
  }

  const btn = document.getElementById("backButton");
  if (!btn) return;

  // pastiin ikon jadi hamburger (3 garis)
  const svg = btn.querySelector("svg");
  if (svg) {
    svg.innerHTML =
      '<path fill="currentColor" d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z"/>';
  }
  btn.classList.add("menu-btn");
  btn.dataset.menu = section;

  // pastiin overlay + drawer ada (kalau belum ada, dibuat otomatis)
  let overlay = document.getElementById("drawerOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "drawerOverlay";
    overlay.className = "drawer-overlay";
    overlay.hidden = true;
    document.body.appendChild(overlay);
  }

  let drawer = document.getElementById("sideDrawer");
  if (!drawer) {
    drawer = document.createElement("aside");
    drawer.id = "sideDrawer";
    drawer.className = "side-drawer";
    drawer.setAttribute("aria-hidden", "true");
    drawer.innerHTML = `
      <div class="side-drawer-head">
        <div class="side-drawer-title">Menu</div>
        <button id="drawerClose" class="icon-button" type="button" aria-label="Tutup menu">✕</button>
      </div>
      <nav class="side-drawer-nav">
        <a class="side-drawer-link" data-menu="anime" href="/">Anime</a>
        <a class="side-drawer-link" data-menu="drama" href="/drama/index.html">Drama China</a>
      </nav>
    `;
    document.body.appendChild(drawer);
  }

  // set theme aktif drawer
  drawer.dataset.active = section;

  const closeBtn = drawer.querySelector("#drawerClose");
  const links = [...drawer.querySelectorAll(".side-drawer-link")];

  // highlight link aktif
  links.forEach((a) => a.classList.toggle("active", a.dataset.menu === section));

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

  // IMPORTANT: pakai capture + stopImmediatePropagation biar ga bentrok core.js (history.back)
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

  // klik menu item -> close dulu (biar halus)
  links.forEach((a) =>
    a.addEventListener("click", () => {
      close();
    })
  );
})();
