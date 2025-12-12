// assets/js/episode.js
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const el = {
    title: $("episodeTitle"),
    player: $("episodePlayer"),
    prev: $("prevEpisodeBtn"),
    next: $("nextEpisodeBtn"),
    back: $("backButton"),
    wrap: $("playerDropdownContainer"),

    serverBtn: $("serverBtn"),
    qualityBtn: $("qualityBtn"),
    downloadBtn: $("downloadBtn"),
    shareBtn: $("shareBtn"),

    serverLabel: $("serverLabel"),
    qualityLabel: $("qualityLabel"),

    serverMenu: $("serverMenu"),
    qualityMenu: $("qualityMenu"),
    downloadMenu: $("downloadMenu"),
  };

  const toast = (m) => typeof showToast === "function" && showToast(m);

  const S = {
    ep: null,
    anime: null,
    prev: null,
    next: null,
    groups: [], // [{quality, servers:[{name,id,href,url?}]}]
    downloads: null,
    q: null,
    s: null,
  };

  const apiPath = (href) => {
    const h = String(href || "").trim();
    return h.startsWith("/") ? `/anime${h}` : null;
  };

  const cleanServer = (title, q) => {
    let t = String(title || "").trim() || "Server";
    if (q) t = t.replace(new RegExp(`\\s*${String(q).trim()}\\s*$`, "i"), "").trim();
    return (t.replace(/\s*(\d{3,4}p|4k)\s*$/i, "").trim() || "Server");
  };

  const pickUrl = (d) =>
    d?.stream_url ||
    d?.streamUrl ||
    d?.streamingUrl ||
    d?.url ||
    d?.embed_url ||
    d?.embedUrl ||
    d?.defaultStreamingUrl ||
    null;

  const normalizeGroups = (serverObj) =>
    (Array.isArray(serverObj?.qualities) ? serverObj.qualities : [])
      .map((q) => {
        const qLabel = (q?.title ? String(q.title).trim() : "") || "Auto";
        const servers = (Array.isArray(q?.serverList) ? q.serverList : [])
          .map((s) => ({
            name: cleanServer(s?.title, qLabel),
            id: s?.serverId ? String(s.serverId).trim() : null,
            href: s?.href ? String(s.href).trim() : null,
            url: s?.url || s?.embed_url || s?.link || null,
          }))
          .filter((x) => x && (x.url || x.id || x.href));
        return servers.length ? { quality: qLabel, servers } : null;
      })
      .filter(Boolean);

  const closeMenus = () => {
    el.serverMenu?.classList.remove("show");
    el.qualityMenu?.classList.remove("show");
    el.downloadMenu?.classList.remove("show");
  };

  const toggle = (menu) => {
    if (!menu) return;
    const open = menu.classList.contains("show");
    closeMenus();
    if (!open) menu.classList.add("show");
  };

  const updateLabels = () => {
    if (el.serverLabel)
      el.serverLabel.textContent = S.s ? (S.q ? `${S.s} ${S.q}` : S.s) : "Auto";
    if (el.qualityLabel) el.qualityLabel.textContent = S.q || "Auto";
  };

  async function resolveServerUrl(server) {
    if (!server) return null;
    if (server.url) return server.url;

    const p = apiPath(server.href);
    if (p) {
      try {
        const r = await apiGet(p);
        const u = pickUrl(r?.data ?? r);
        if (u) return u;
      } catch {}
    }

    if (server.id) {
      try {
        const r = await apiGet(`/anime/samehadaku/server/${encodeURIComponent(server.id)}`);
        return pickUrl(r?.data ?? r);
      } catch {}
    }

    return null;
  }

  async function setStream(q, serverName) {
    if (!el.player || !S.groups.length) return;

    const qUse = q || S.q || S.groups[0]?.quality || null;
    const g = S.groups.find((x) => x.quality === qUse) || S.groups[0];
    if (!g) return;

    const s = (serverName && g.servers.find((x) => x.name === serverName)) || g.servers[0];
    if (!s) return;

    const url = await resolveServerUrl(s);
    if (!url) return toast("Gagal memuat server");

    el.player.src = url;
    S.q = g.quality || null;
    S.s = s.name || null;
    updateLabels();
  }

  const renderServerMenu = () => {
    const m = el.serverMenu;
    if (!m) return;
    m.innerHTML = "";

    if (!S.groups.length) {
      m.innerHTML = '<div class="dropdown-empty">Server tidak tersedia</div>';
      return;
    }

    m.innerHTML = '<div class="dropdown-title">Pilih Server</div>';
    const frag = document.createDocumentFragment();

    S.groups.forEach((g) => {
      const q = g.quality || "Auto";
      g.servers.forEach((s) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "dropdown-item";
        if (S.s === s.name && S.q === q) b.classList.add("active");
        b.textContent = `${s.name || "Server"} ${q}`.trim();
        b.addEventListener("click", () => {
          setStream(q, s.name || null);
          closeMenus();
          toast(`Server: ${s.name || "Server"} ${q}`);
        });
        frag.appendChild(b);
      });
    });

    m.appendChild(frag);
  };

  const renderQualityMenu = () => {
    const m = el.qualityMenu;
    if (!m) return;
    m.innerHTML = "";

    if (!S.groups.length) {
      m.innerHTML = '<div class="dropdown-empty">Kualitas tidak tersedia</div>';
      return;
    }

    m.innerHTML = '<div class="dropdown-title">Pilih Kualitas Streaming</div>';

    const frag = document.createDocumentFragment();
    [...new Set(S.groups.map((g) => g.quality))].forEach((q) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "dropdown-item";
      if (S.q === q) b.classList.add("active");
      b.textContent = q || "Auto";
      b.addEventListener("click", () => {
        setStream(q || null, null);
        closeMenus();
        toast(`Kualitas: ${q || "Auto"}`);
      });
      frag.appendChild(b);
    });

    m.appendChild(frag);
  };

  const renderDownloadMenu = () => {
    const m = el.downloadMenu;
    if (!m) return;
    m.innerHTML = "";

    const formats = Array.isArray(S.downloads) ? S.downloads : [];
    if (!formats.length) {
      m.innerHTML = '<div class="dropdown-empty">Link unduhan belum tersedia</div>';
      return;
    }

    m.innerHTML = '<div class="dropdown-title">Unduh berdasarkan kualitas</div>';
    const frag = document.createDocumentFragment();
    let added = 0;

    formats.forEach((fmt, idx) => {
      const title = (fmt?.title ? String(fmt.title).trim() : "") || "Format";
      const qualities = Array.isArray(fmt?.qualities) ? fmt.qualities : [];
      if (!qualities.length) return;

      const h = document.createElement("div");
      h.className = "dropdown-subtitle";
      h.textContent = title;
      if (idx > 0) h.style.marginTop = "6px";
      frag.appendChild(h);

      qualities.forEach((q) => {
        const qTitle = (q?.title ? String(q.title).trim() : "") || "Auto";
        (Array.isArray(q?.urls) ? q.urls : []).forEach((u) => {
          const url = (u?.url ? String(u.url).trim() : "") || "";
          if (!url) return;

          const a = document.createElement("a");
          a.className = "dropdown-item";
          a.href = url;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.download = "";
          a.textContent = `${qTitle} - ${(u?.title ? String(u.title).trim() : "") || "Server"}`.trim();
          frag.appendChild(a);
          added++;
        });
      });
    });

    m.appendChild(frag);
    if (!added) m.innerHTML += '<div class="dropdown-empty">Link unduhan belum tersedia</div>';
  };

  const share = () => {
    const epName = (el.title?.textContent || document.title || "Episode")
      .replace(/^AniKuy\s*-\s*/i, "")
      .trim();

    const url = S.ep ? `${location.origin}${location.pathname}?slug=${S.ep}` : location.href;
    const text = `Tonton ${epName} di AniKuy\n${url}`;
    const title = `Tonton ${epName} di AniKuy`;

    if (navigator.share) return navigator.share({ title, text: title, url }).catch(() => {});
    if (navigator.clipboard?.writeText)
      return navigator.clipboard.writeText(text).then(
        () => toast("Link episode disalin"),
        () => toast("Gagal menyalin link")
      );

    window.prompt("Salin teks ini:", text);
  };

  async function loadEpisode(epSlug) {
    if (!el.player || !el.title) return;

    let json;
    try {
      json = await apiGet(`/anime/samehadaku/episode/${encodeURIComponent(epSlug)}`);
    } catch {
      return toast("Gagal memuat episode");
    }

    const d = json?.status === "success" ? json.data : null;
    if (!d) return toast("Episode tidak ditemukan");

    S.ep = epSlug;
    S.anime = d.animeId || S.anime;
    S.prev = d.hasPrevEpisode ? d?.prevEpisode?.episodeId || null : null;
    S.next = d.hasNextEpisode ? d?.nextEpisode?.episodeId || null : null;

    if (el.back && S.anime) el.back.dataset.href = `/anime/detail?slug=${encodeURIComponent(S.anime)}`;

    el.title.textContent = d.title || "Episode";
    if (d.defaultStreamingUrl) el.player.src = d.defaultStreamingUrl;
    else el.player.removeAttribute("src");

    S.groups = normalizeGroups(d.server || {});
    S.downloads = Array.isArray(d?.downloadUrl?.formats) ? d.downloadUrl.formats : null;

    const g0 = S.groups[0];
    const s0 = g0?.servers?.[0];
    S.q = s0 ? g0.quality || null : null;
    S.s = s0 ? s0.name || null : null;

    updateLabels();
    if (el.prev) el.prev.disabled = !S.prev;
    if (el.next) el.next.disabled = !S.next;

    renderServerMenu();
    renderQualityMenu();
    renderDownloadMenu();

    const p = new URLSearchParams(location.search);
    p.set("slug", epSlug);
    history.replaceState({}, "", `${location.pathname}?${p.toString()}`);
  }

  // close menus on outside click
  document.addEventListener("click", (e) => {
    if (!el.wrap) return;
    if (!el.wrap.contains(e.target) && !e.target.closest(".toolbar-btn")) closeMenus();
  });

  el.prev?.addEventListener("click", () => S.prev && loadEpisode(S.prev));
  el.next?.addEventListener("click", () => S.next && loadEpisode(S.next));

  el.serverBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!S.groups.length) return;
    renderServerMenu();
    toggle(el.serverMenu);
  });

  el.qualityBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!S.groups.length) return;
    renderQualityMenu();
    toggle(el.qualityMenu);
  });

  el.downloadBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!S.downloads) return toast("Link unduhan belum tersedia");
    renderDownloadMenu();
    toggle(el.downloadMenu);
  });

  el.shareBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    share();
  });

  document.addEventListener("DOMContentLoaded", () => {
    const epSlug = new URLSearchParams(location.search).get("slug");
    if (!epSlug) return toast("Episode tidak ditemukan");
    loadEpisode(epSlug);
  });
})();
