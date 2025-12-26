(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const toast = (m) => typeof showToast === "function" && showToast(m);
  const pick = (...v) => v.find(Boolean) || "";

  const el = {
    title: $("episodeTitle"),
    player: $("episodePlayer"),
    chip: $("episodeChipList"),
    serverMenu: $("serverMenu"),
    qualityMenu: $("qualityMenu"),
    downloadMenu: $("downloadMenu"),
    serverBtn: $("serverBtn"),
    qualityBtn: $("qualityBtn"),
    downloadBtn: $("downloadBtn"),
    shareBtn: $("shareBtn"),
    serverLabel: $("serverLabel"),
    qualityLabel: $("qualityLabel"),
    downloadLabel: $("downloadLabel"),
  };

  const slug = new URLSearchParams(location.search).get("slug");

  /* dropdown */
  const panels = [el.serverMenu, el.qualityMenu, el.downloadMenu].filter(Boolean);
  const closePanels = () => panels.forEach((p) => p.classList.remove("show"));
  const toggle = (p) => {
    if (!p) return;
    const on = !p.classList.contains("show");
    closePanels();
    on && p.classList.add("show");
  };
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".player-toolbar") && !e.target.closest(".dropdown-panel")) closePanels();
  });

  const removeIfEmpty = (btn, panel) => (btn?.remove(), panel?.remove());
  const menu = (root, title, nodes) => {
    if (!root) return;
    root.innerHTML = `<div class="dropdown-title">${title}</div>`;
    if (!nodes.length) return (root.innerHTML += `<div class="dropdown-empty">Tidak tersedia</div>`);
    nodes.forEach((n) => root.appendChild(n));
  };

  const fetchStream = async (serverId) => {
    try {
      const j = await apiGet(`/anime/samehadaku/server/${serverId}`);
      return pick(j?.data?.url, j?.data?.streamingUrl, j?.data?.embedUrl, j?.data?.iframeUrl);
    } catch {
      return "";
    }
  };

  const normalizeServers = (d) =>
    (d?.server?.qualities || []).flatMap((q) => {
      const quality = String(q?.title || "").trim();
      if (!quality) return [];
      return (q?.serverList || [])
        .map((s) => ({ quality, serverId: s?.serverId }))
        .filter((x) => x.serverId);
    });

  const normalizeDownloads = (d) =>
    (d?.downloadUrl?.formats || []).flatMap((f) => {
      const format = String(f?.title || "").trim();
      if (!format) return [];
      return (f?.qualities || []).flatMap((q) => {
        const quality = String(q?.title || "").trim();
        if (!quality) return [];
        return (q?.urls || [])
          .map((u) => ({ format, quality, host: String(u?.title || "").trim() || "Link", url: u?.url }))
          .filter((x) => x.url);
      });
    });

  const renderChips = (list) => {
    if (!Array.isArray(list) || !el.chip) return;
    el.chip.innerHTML = "";
    list
      .map((it) => {
        const href = it?.href;
        if (!href) return null;
        const epSlug = href.split("/").filter(Boolean).pop();
        const num = parseInt((String(it?.title || "").match(/\d+$/) || ["0"])[0], 10);
        return { epSlug, num };
      })
      .filter(Boolean)
      .sort((a, b) => a.num - b.num)
      .forEach(({ epSlug, num }) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "episode-chip" + (epSlug === slug ? " active" : "");
        b.textContent = num || "?";
        b.onclick = () => epSlug === slug || (location.href = `/anime/episode?slug=${epSlug}`);
        el.chip.appendChild(b);
      });
    el.chip.querySelector(".episode-chip.active")?.scrollIntoView?.({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  const loadEpisode = async () => {
    if (!slug) return toast("Slug episode tidak ditemukan");

    let j;
    try {
      j = await apiGet(`/anime/samehadaku/episode/${slug}`);
    } catch {
      return toast("Gagal memuat episode");
    }

    const d = j?.data;
    if (!d) return toast("Episode tidak ditemukan");

    el.title && (el.title.textContent = d.title || "Episode");
    document.title = `AniKuy - ${d.title || "Episode"}`;
    el.player && (el.player.src = d.defaultStreamingUrl || "");
    renderChips(d.recommendedEpisodeList);

    /* QUALITY + SERVER (active biru ngikut pilihan) */
    const raw = normalizeServers(d);
    const byQ = new Map();

    raw.forEach(({ quality, serverId }) => {
      if (!byQ.has(quality)) byQ.set(quality, []);
      const arr = byQ.get(quality);
      if (!arr.some((x) => x.serverId === serverId)) arr.push({ serverId, label: "" });
    });

    const qualities = [...byQ.keys()].filter(Boolean);
    qualities.forEach((q) => (byQ.get(q) || []).forEach((s, i) => (s.label = `Server ${i + 1}`)));

    if (!qualities.length) {
      removeIfEmpty(el.qualityBtn, el.qualityMenu);
      removeIfEmpty(el.serverBtn, el.serverMenu);
    } else {
      let qAct = qualities[0];
      let sAct = (byQ.get(qAct) || [])[0]?.serverId || null;

      const servers = (q) => byQ.get(q) || [];
      const serverLabel = () => servers(qAct).find((x) => x.serverId === sAct)?.label || "-";

      const setLabels = () => {
        el.qualityLabel && (el.qualityLabel.textContent = qAct || "-");
        el.serverLabel && (el.serverLabel.textContent = serverLabel());
        el.downloadLabel && (el.downloadLabel.textContent = qAct || "Pilih kualitas");
      };

      const setPlayer = async () => {
        if (!sAct) return;
        const url = await fetchStream(sAct);
        url && el.player && (el.player.src = url);
      };

      const renderQuality = () => {
        if (!el.qualityMenu) return;
        menu(
          el.qualityMenu,
          "Pilih Kualitas",
          qualities.map((q) => {
            const b = document.createElement("button");
            b.className = "dropdown-item" + (q === qAct ? " active" : "");
            b.textContent = q;
            b.onclick = () => {
              qAct = q;
              sAct = servers(qAct)[0]?.serverId || null;
              setLabels();
              renderQuality();   // <-- FIX: active biru ikut pilihan
              renderServer();    // <-- ikut update server list
              setPlayer();
              closePanels();
            };
            return b;
          })
        );
      };

      const renderServer = () => {
        if (!el.serverMenu) return;
        const list = servers(qAct);
        if (!list.length) return removeIfEmpty(el.serverBtn, el.serverMenu);
        menu(
          el.serverMenu,
          "Pilih Server",
          list.map((s) => {
            const b = document.createElement("button");
            b.className = "dropdown-item" + (s.serverId === sAct ? " active" : "");
            b.textContent = s.label;
            b.onclick = () => {
              sAct = s.serverId;
              setLabels();
              renderServer();   // <-- FIX: active biru ikut pilihan
              setPlayer();
              closePanels();
            };
            return b;
          })
        );
      };

      setLabels();
      renderQuality();
      renderServer();
      setPlayer();

      el.qualityBtn && (el.qualityBtn.onclick = () => toggle(el.qualityMenu));
      el.serverBtn && (el.serverBtn.onclick = () => toggle(el.serverMenu));
    }

    /* DOWNLOAD */
    const dls = normalizeDownloads(d);
    if (!dls.length) {
      removeIfEmpty(el.downloadBtn, el.downloadMenu);
    } else if (el.downloadMenu && el.downloadBtn) {
      const groups = new Map();
      dls.forEach((x) => {
        const k = `${x.format} • ${x.quality}`;
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(x);
      });

      el.downloadMenu.innerHTML = "";
      for (const [k, items] of groups.entries()) {
        const head = document.createElement("div");
        head.className = "dropdown-title";
        head.textContent = k;
        el.downloadMenu.appendChild(head);

        items.forEach((x) => {
          const a = document.createElement("a");
          a.className = "dropdown-item";
          a.href = x.url;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.textContent = x.host;
          el.downloadMenu.appendChild(a);
        });
      }

      el.downloadBtn.onclick = () => toggle(el.downloadMenu);
    }

    /* SHARE */
    el.shareBtn &&
      (el.shareBtn.onclick = () =>
        navigator.share
          ? navigator.share({ title: document.title, url: location.href })
          : navigator.clipboard
              .writeText(location.href)
              .then(() => toast("Link disalin"))
              .catch(() => toast("Gagal menyalin link")));
  };

  document.addEventListener("DOMContentLoaded", loadEpisode);
})();
