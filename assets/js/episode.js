// assets/js/episode.js
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const toast = (m) => typeof showToast === "function" && showToast(m);

  const el = {
    title: $("episodeTitle"),
    player: $("episodePlayer"), // iframe
    prev: $("prevEpisodeBtn"),
    next: $("nextEpisodeBtn"),
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

  let epSlug = null,
    animeSlug = null,
    prevSlug = null,
    nextSlug = null,
    streamGroups = [],
    downloadData = null,
    selectedQuality = null,
    selectedServerName = null;

  const apiPath = (href) => {
    const h = String(href || "").trim();
    return h.startsWith("/") ? `/anime${h}` : null;
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

  const cleanServer = (title, q) => {
    let t = String(title || "").trim() || "Server";
    if (q) t = t.replace(new RegExp(`\\s*${String(q).trim()}\\s*$`, "i"), "").trim();
    return (t.replace(/\s*(\d{3,4}p|4k)\s*$/i, "").trim() || "Server");
  };

  const rankQ = (q) => {
    const t = String(q || "").toLowerCase();
    if (t.includes("4k")) return 4000;
    const m = t.match(/(\d{3,4})\s*p/);
    return m ? parseInt(m[1], 10) || 0 : 0;
  };

  const normalizeGroups = (serverObj) =>
    (Array.isArray(serverObj?.qualities) ? serverObj.qualities : []).map((q) => {
      const quality = (q?.title ? String(q.title).trim() : "") || "Auto";
      const servers = (Array.isArray(q?.serverList) ? q.serverList : [])
        .map((s) => ({
          name: cleanServer(s?.title, quality),
          id: s?.serverId ? String(s.serverId).trim() : null,
          href: s?.href ? String(s.href).trim() : null,
        }))
        .filter((s) => s && (s.id || s.href));
      return { quality, servers, hasServers: !!servers.length };
    });

  const bestPlayable = (groups) => {
    const ok = (groups || []).filter((g) => g?.hasServers);
    if (!ok.length) return null;
    ok.sort((a, b) => rankQ(b.quality) - rankQ(a.quality));
    return ok[0] || null;
  };

  async function resolveServerUrl(server) {
    if (!server) return null;

    const p = apiPath(server.href);
    if (p) {
      try {
        const res = await apiGet(p);
        const url = pickUrl(res?.data ?? res);
        if (url) return url;
      } catch {}
    }

    if (server.id) {
      try {
        const res = await apiGet(`/anime/samehadaku/server/${encodeURIComponent(server.id)}`);
        return pickUrl(res?.data ?? res);
      } catch {}
    }

    return null;
  }

  const closeAll = () => {
    el.serverMenu?.classList.remove("show");
    el.qualityMenu?.classList.remove("show");
    el.downloadMenu?.classList.remove("show");
  };

  document.addEventListener("click", (e) => {
    const c = $("playerDropdownContainer");
    if (c && !c.contains(e.target) && !e.target.closest(".toolbar-btn")) closeAll();
  });

  const updateLabels = () => {
    if (el.serverLabel)
      el.serverLabel.textContent = selectedServerName
        ? selectedQuality
          ? `${selectedServerName} ${selectedQuality}`
          : selectedServerName
        : "Auto";
    if (el.qualityLabel) el.qualityLabel.textContent = selectedQuality || "Auto";
  };

  async function setStreamSource(qWanted, sWanted) {
    if (!el.player || !streamGroups.length) return;

    const wanted = qWanted || selectedQuality || streamGroups[0]?.quality || null;
    let g = streamGroups.find((x) => x.quality === wanted) || streamGroups[0];

    if (!g?.hasServers) {
      const best = bestPlayable(streamGroups);
      if (!best) return toast("Server tidak tersedia");
      toast(`Server tidak tersedia untuk ${wanted || "kualitas ini"}`);
      g = best;
    }

    const s = (sWanted && g.servers.find((x) => x.name === sWanted)) || g.servers[0];
    if (!s) return toast("Server tidak tersedia");

    const url = await resolveServerUrl(s);
    if (!url) return toast("Gagal memuat server");

    el.player.src = url;
    selectedQuality = g.quality || null;
    selectedServerName = s.name || null;
    updateLabels();
  }

  function renderServerMenu() {
    if (!el.serverMenu) return;
    el.serverMenu.innerHTML = "";

    const best = bestPlayable(streamGroups);
    if (!streamGroups.length || !best) {
      el.serverMenu.innerHTML = '<div class="dropdown-empty">Server tidak tersedia</div>';
      return;
    }

    el.serverMenu.innerHTML = '<div class="dropdown-title">Pilih Server</div>';

    let g = streamGroups.find((x) => x.quality === selectedQuality);
    if (!g?.hasServers) g = best;
    const q = g.quality || "Auto";

    const frag = document.createDocumentFragment();
    g.servers.forEach((s) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "dropdown-item";
      if (selectedServerName === s.name && selectedQuality === q) b.classList.add("active");
      b.textContent = `${s.name || "Server"} ${q}`.trim();
      b.addEventListener("click", () => {
        setStreamSource(q, s.name || null);
        closeAll();
        toast(`Server: ${s.name || "Server"} ${q}`);
      });
      frag.appendChild(b);
    });
    el.serverMenu.appendChild(frag);
  }

  function renderQualityMenu() {
    if (!el.qualityMenu) return;
    el.qualityMenu.innerHTML = "";

    if (!streamGroups.length) {
      el.qualityMenu.innerHTML = '<div class="dropdown-empty">Kualitas tidak tersedia</div>';
      return;
    }

    el.qualityMenu.innerHTML = '<div class="dropdown-title">Pilih Kualitas Streaming</div>';
    const frag = document.createDocumentFragment();

    streamGroups.forEach((g) => {
      const q = g.quality || "Auto";
      const b = document.createElement("button");
      b.type = "button";
      b.className = "dropdown-item";
      if (selectedQuality === q) b.classList.add("active");

      if (!g.hasServers) {
        b.disabled = true;
        b.style.opacity = "0.55";
        b.style.cursor = "not-allowed";
      }

      b.textContent = q;
      b.addEventListener("click", () => {
        if (!g.hasServers) return toast(`Server tidak tersedia untuk ${q}`);
        setStreamSource(q, null);
        closeAll();
        toast(`Kualitas: ${q}`);
      });

      frag.appendChild(b);
    });

    el.qualityMenu.appendChild(frag);
  }

  function renderDownloadMenu() {
    if (!el.downloadMenu) return;
    el.downloadMenu.innerHTML = "";

    const formats = Array.isArray(downloadData) ? downloadData : [];
    if (!formats.length) {
      el.downloadMenu.innerHTML = '<div class="dropdown-empty">Link unduhan belum tersedia</div>';
      return;
    }

    el.downloadMenu.innerHTML = '<div class="dropdown-title">Unduh berdasarkan kualitas</div>';
    const frag = document.createDocumentFragment();
    let added = 0;

    formats.forEach((fmt, idx) => {
      const title = (fmt?.title ? String(fmt.title).trim() : "") || "Format";
      const qs = Array.isArray(fmt?.qualities) ? fmt.qualities : [];
      if (!qs.length) return;

      const h = document.createElement("div");
      h.className = "dropdown-subtitle";
      h.textContent = title;
      if (idx > 0) h.style.marginTop = "6px";
      frag.appendChild(h);

      qs.forEach((q) => {
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

    el.downloadMenu.appendChild(frag);
    if (!added) el.downloadMenu.innerHTML += '<div class="dropdown-empty">Link unduhan belum tersedia</div>';
  }

  // ✅ share: 2 baris (teks + url)
  function handleShare() {
    const name = (el.title?.textContent || document.title || "Episode").trim();
    const url = epSlug ? `${location.origin}${location.pathname}?slug=${epSlug}` : location.href;
    const copyText = `Tonton ${name} di AniKuy\n${url}`;
    const shareTitle = `Tonton ${name} di AniKuy`;

    if (navigator.share) return navigator.share({ title: shareTitle, text: shareTitle, url }).catch(() => {});
    if (navigator.clipboard?.writeText)
      return navigator.clipboard.writeText(copyText).then(
        () => toast("Link episode disalin"),
        () => toast("Gagal menyalin link")
      );

    window.prompt("Salin teks ini:", copyText);
  }

  async function loadEpisode(slug) {
    if (!el.player || !el.title) return;

    let json;
    try {
      json = await apiGet(`/anime/samehadaku/episode/${encodeURIComponent(slug)}`);
    } catch {
      return toast("Gagal memuat episode");
    }

    const d = json?.status === "success" ? json.data : null;
    if (!d) return toast("Episode tidak ditemukan");

    epSlug = slug;
    animeSlug = d.animeId || animeSlug;
    prevSlug = d.hasPrevEpisode ? d?.prevEpisode?.episodeId || null : null;
    nextSlug = d.hasNextEpisode ? d?.nextEpisode?.episodeId || null : null;

    const back = $("backButton");
    if (back && animeSlug) back.dataset.href = `/anime/detail?slug=${encodeURIComponent(animeSlug)}`;

    el.title.textContent = d.title || "Episode";

    if (d.defaultStreamingUrl) el.player.src = d.defaultStreamingUrl;
    else el.player.removeAttribute("src");

    streamGroups = normalizeGroups(d.server || {});
    downloadData = Array.isArray(d?.downloadUrl?.formats) ? d.downloadUrl.formats : null;

    const best = bestPlayable(streamGroups);
    if (best?.servers?.length) {
      selectedQuality = best.quality || null;
      selectedServerName = best.servers[0].name || null;
      setStreamSource(selectedQuality, selectedServerName);
    } else {
      selectedQuality = streamGroups[0]?.quality || null;
      selectedServerName = null;
      updateLabels();
    }

    el.prev && (el.prev.disabled = !prevSlug);
    el.next && (el.next.disabled = !nextSlug);

    renderServerMenu();
    renderQualityMenu();
    renderDownloadMenu();

    const p = new URLSearchParams(location.search);
    p.set("slug", slug);
    history.replaceState({}, "", `${location.pathname}?${p.toString()}`);
  }

  // listeners
  el.prev?.addEventListener("click", () => prevSlug && loadEpisode(prevSlug));
  el.next?.addEventListener("click", () => nextSlug && loadEpisode(nextSlug));

  el.serverBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    renderServerMenu();
    const open = el.serverMenu?.classList.contains("show");
    closeAll();
    !open && el.serverMenu?.classList.add("show");
  });

  el.qualityBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    renderQualityMenu();
    const open = el.qualityMenu?.classList.contains("show");
    closeAll();
    !open && el.qualityMenu?.classList.add("show");
  });

  el.downloadBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!downloadData) return toast("Link unduhan belum tersedia");
    renderDownloadMenu();
    const open = el.downloadMenu?.classList.contains("show");
    closeAll();
    !open && el.downloadMenu?.classList.add("show");
  });

  el.shareBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    handleShare();
  });

  // ===== lock landscape saat fullscreen (native fullscreen dari iframe) =====
  const lockLS = async (on) => {
    try {
      if (!screen.orientation?.lock) return;
      if (on) await screen.orientation.lock("landscape");
      else screen.orientation.unlock();
    } catch {}
  };
  const onFs = () => lockLS(!!(document.fullscreenElement || document.webkitFullscreenElement));
  document.addEventListener("fullscreenchange", onFs);
  document.addEventListener("webkitfullscreenchange", onFs);

  // init
  document.addEventListener("DOMContentLoaded", () => {
    const s = new URLSearchParams(location.search).get("slug");
    if (!s) return toast("Episode tidak ditemukan");
    loadEpisode(s);
  });
})();
