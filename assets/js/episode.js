// assets/js/episode.js
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const qs = (s, r = document) => r.querySelector(s);
  const pick = (...v) => v.find((x) => x != null && x !== "");
  const toast = (m) => typeof showToast === "function" && showToast(m);

  const el = {
    title: $("episodeTitle"),
    player: $("episodePlayer"),
    serverBtn: $("serverBtn"),
    qualityBtn: $("qualityBtn"),
    downloadBtn: $("downloadBtn"),
    shareBtn: $("shareBtn"),
    serverMenu: $("serverMenu"),
    qualityMenu: $("qualityMenu"),
    downloadMenu: $("downloadMenu"),
    serverLabel: $("serverLabel"),
    qualityLabel: $("qualityLabel"),
    chips: $("episodeChipList"),
  };

  const slug = new URLSearchParams(location.search).get("slug");

  // ===== dropdown =====
  const panels = [el.serverMenu, el.qualityMenu, el.downloadMenu].filter(Boolean);
  const closePanels = () => panels.forEach((p) => p.classList.remove("show"));
  const togglePanel = (p) => {
    if (!p) return;
    const on = !p.classList.contains("show");
    closePanels();
    p.classList.toggle("show", on);
  };

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".player-toolbar,.dropdown-panel")) closePanels();
  });

  // ===== normalizers =====
  const uniqBy = (arr, keyFn) => {
    const seen = new Set();
    return arr.filter((x) => {
      const k = keyFn(x);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  const normalizeSources = (d) => {
    const out = [];
    const push = (server, quality, url) =>
      url &&
      out.push({
        server: String(server || "Server").trim(),
        quality: String(quality || "Auto").trim(),
        url: String(url),
      });

    (Array.isArray(d?.sources) ? d.sources : []).forEach((it) =>
      push(it?.server || it?.serverName || it?.name, it?.quality || it?.res || it?.label, it?.url || it?.link || it?.src)
    );

    (Array.isArray(d?.streamList) ? d.streamList : []).forEach((it) =>
      push(it?.server || it?.serverName || it?.name, it?.quality || it?.res || it?.label, it?.url || it?.link || it?.src)
    );

    (Array.isArray(d?.serverList) ? d.serverList : []).forEach((s) => {
      const sName = s?.title || s?.serverName || s?.name;
      (Array.isArray(s?.qualityList) ? s.qualityList : []).forEach((q) =>
        push(sName, q?.quality || q?.res || q?.label, q?.url || q?.link || q?.src)
      );
    });

    return uniqBy(out, (x) => `${x.server}|${x.quality}|${x.url}`);
  };

  const normalizeDownloads = (d) => {
    const out = [];
    const list = pick(d?.downloadList, d?.downloads, d?.download);
    if (!Array.isArray(list)) return out;

    list.forEach((it) => {
      const q = String(it?.quality || it?.res || it?.label || "Link").trim();
      const direct = it?.url || it?.link;
      if (direct) return out.push({ label: q, url: String(direct) });

      (Array.isArray(it?.links) ? it.links : []).forEach((l) => {
        const url = l?.url || l?.link;
        if (!url) return;
        out.push({
          label: `${q} - ${String(l?.server || l?.name || "Server").trim()}`,
          url: String(url),
        });
      });
    });

    return uniqBy(out, (x) => x.url);
  };

  const getEmbedUrl = (d) =>
    pick(d?.embedUrl, d?.embed_url, d?.iframe, d?.iframeUrl, d?.playerUrl, d?.streamUrl, d?.videoUrl, d?.url);

  // ===== UI render =====
  const renderMenu = (menuEl, title, items, active, onPick, emptyText) => {
    if (!menuEl) return;
    menuEl.innerHTML = `<div class="dropdown-title">${title}</div>`;
    if (!items.length) return (menuEl.innerHTML += `<div class="dropdown-empty">${emptyText}</div>`);
    items.forEach((v) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "dropdown-item" + (v === active ? " active" : "");
      b.textContent = v;
      b.addEventListener("click", () => onPick(v));
      menuEl.appendChild(b);
    });
  };

  const renderDownloadMenu = (downloads) => {
    if (!el.downloadMenu) return;
    el.downloadMenu.innerHTML = `<div class="dropdown-title">Link Unduh</div>`;
    if (!downloads.length) return (el.downloadMenu.innerHTML += `<div class="dropdown-empty">Link unduh tidak tersedia</div>`);
    downloads.forEach((d) => {
      const a = document.createElement("a");
      a.className = "dropdown-item";
      a.href = d.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = d.label;
      el.downloadMenu.appendChild(a);
    });
  };

  const epNum = (t, fb) => {
    const m = String(t || "").match(/(\d+)(?!.*\d)/);
    return m ? +m[1] : fb;
  };

  const renderChips = (list, current) => {
    if (!el.chips) return;
    el.chips.innerHTML = "";
    if (!Array.isArray(list) || !list.length) return el.chips.parentElement?.classList.add("hidden");

    const frag = document.createDocumentFragment();
    list.forEach((ep, i) => {
      const epSlug = ep?.episodeId || ep?.id || ep?.slug || ep?.episodeSlug;
      if (!epSlug) return;

      const b = document.createElement("button");
      b.type = "button";
      b.className = "episode-chip" + (String(epSlug) === String(current) ? " active" : "");
      b.textContent = String(epNum(ep?.title, i + 1));
      b.addEventListener("click", () => {
        if (String(epSlug) !== String(current)) location.href = `/anime/episode?slug=${encodeURIComponent(epSlug)}`;
      });
      frag.appendChild(b);
    });

    el.chips.appendChild(frag);
    qs(".episode-chip.active", el.chips)?.scrollIntoView?.({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    toast("Link disalin!");
  };

  // ===== main =====
  async function loadEpisode(epSlug) {
    let json;
    try {
      json = await apiGet(`/anime/samehadaku/episode/${encodeURIComponent(epSlug)}`);
    } catch {
      return toast("Gagal memuat episode.");
    }

    const d = json?.status === "success" ? json.data : null;
    if (!d) return toast("Episode tidak ditemukan.");

    const title = String(pick(d?.title, d?.episodeTitle, d?.name, "Episode")).trim();
    if (el.title) el.title.textContent = title || "Episode";
    document.title = `AniKuy - ${title || "Episode"}`;

    const embed = getEmbedUrl(d);
    if (el.player) embed ? (el.player.src = String(embed)) : toast("Player tidak tersedia.");

    const flat = normalizeSources(d);
    const servers = [...new Set(flat.map((x) => x.server))];
    const qsFor = (s) => flat.filter((x) => x.server === s).map((x) => x.quality);

    let activeS = flat[0]?.server || "Auto";
    let activeQ = flat[0]?.quality || "Auto";

    const apply = (s, q) => {
      const src =
        flat.find((x) => x.server === s && x.quality === q) ||
        flat.find((x) => x.server === s) ||
        flat[0];

      if (!src) return;

      activeS = src.server;
      activeQ = src.quality;

      if (el.serverLabel) el.serverLabel.textContent = activeS || "Auto";
      if (el.qualityLabel) el.qualityLabel.textContent = activeQ || "Auto";
      if (el.player && src.url) el.player.src = src.url;

      renderMenu(el.serverMenu, "Pilih Server", servers, activeS, (ns) => {
        const ql = qsFor(ns);
        apply(ns, ql[0] || "Auto");
        closePanels();
      }, "Server tidak tersedia");

      const ql = qsFor(activeS);
      renderMenu(el.qualityMenu, "Pilih Kualitas", ql, activeQ, (nq) => {
        apply(activeS, nq);
        closePanels();
      }, "Kualitas tidak tersedia");
    };

    if (flat.length) apply(activeS, activeQ);
    else {
      if (el.serverLabel) el.serverLabel.textContent = "Auto";
      if (el.qualityLabel) el.qualityLabel.textContent = "Auto";
      renderMenu(el.serverMenu, "Pilih Server", [], "Auto", () => {}, "Server tidak tersedia");
      renderMenu(el.qualityMenu, "Pilih Kualitas", [], "Auto", () => {}, "Kualitas tidak tersedia");
    }

    renderDownloadMenu(normalizeDownloads(d));

    // episode chips: pakai list yang ada, kalau kosong coba tarik detail anime
    let epList = pick(d?.episodeList, d?.episodes);
    const animeSlug = pick(d?.animeId, d?.animeSlug, d?.anime?.animeId, d?.anime?.slug);

    if ((!Array.isArray(epList) || !epList.length) && animeSlug) {
      try {
        const aj = await apiGet(`/anime/samehadaku/anime/${encodeURIComponent(animeSlug)}`);
        const ad = aj?.status === "success" ? aj.data : null;
        if (Array.isArray(ad?.episodeList)) epList = ad.episodeList;
      } catch {}
    }
    renderChips(epList, epSlug);

    // bind buttons (sekali saja)
    el.serverBtn?.addEventListener("click", () => togglePanel(el.serverMenu), { once: true });
    el.qualityBtn?.addEventListener("click", () => togglePanel(el.qualityMenu), { once: true });
    el.downloadBtn?.addEventListener("click", () => togglePanel(el.downloadMenu), { once: true });

    el.shareBtn?.addEventListener(
      "click",
      async () => {
        closePanels();
        const url = location.href;
        if (navigator.share) {
          try {
            await navigator.share({ title: document.title, url });
            return;
          } catch {}
        }
        copyText(url);
      },
      { once: true }
    );
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!slug) return toast("Slug episode tidak ditemukan");
    loadEpisode(slug);
  });
})();
