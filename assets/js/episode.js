// assets/js/episode.js
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
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
    chip: $("episodeChipList"),
  };

  const slug = new URLSearchParams(location.search).get("slug") || "";
  const toast = (m) => typeof showToast === "function" && showToast(m);
  const enc = encodeURIComponent;

  const pick = (...v) => v.find(er).find((x) => x != null && x !== "");
  function er(v) {
    return v;
  }

  // ---------- dropdown ----------
  const panels = [el.serverMenu, el.qualityMenu, el.downloadMenu].filter(Boolean);
  const closePanels = () => panels.forEach((p) => p.classList.remove("show"));
  const toggle = (p) => {
    if (!p) return;
    const show = !p.classList.contains("show");
    closePanels();
    p.classList.toggle("show", show);
  };

  document.addEventListener("click", (e) => {
    if (e.target.closest(".player-toolbar,.dropdown-panel")) return;
    closePanels();
  });

  // ---------- normalize ----------
  const uniq = (arr, keyFn) => {
    const s = new Set();
    return arr.filter((x) => {
      const k = keyFn(x);
      if (s.has(k)) return false;
      s.add(k);
      return true;
    });
  };

  // ✅ support JSON kamu: data.server.qualities[].serverList[].href (butuh fetch server detail)
  // juga tetap support bentuk lain (sources/serverList/streamList) kalau ada
  const normStreams = (d) => {
    const out = [];

    // A) flat sources
    if (Array.isArray(d?.sources)) {
      d.sources.forEach((it) => {
        const url = it?.url || it?.link || it?.src;
        if (!url) return;
        out.push({ server: String(it?.server || it?.name || "Server"), quality: String(it?.quality || "Auto"), url: String(url) });
      });
    }

    // B) nested serverList->qualityList
    if (Array.isArray(d?.serverList)) {
      d.serverList.forEach((s) => {
        const sName = String(s?.title || s?.serverName || "Server");
        (Array.isArray(s?.qualityList) ? s.qualityList : []).forEach((q) => {
          const url = q?.url || q?.link || q?.src;
          if (!url) return;
          out.push({ server: sName, quality: String(q?.quality || "Auto"), url: String(url) });
        });
      });
    }

    // C) streamList
    if (Array.isArray(d?.streamList)) {
      d.streamList.forEach((it) => {
        const url = it?.url || it?.link || it?.src;
        if (!url) return;
        out.push({ server: String(it?.server || it?.name || "Server"), quality: String(it?.quality || "Auto"), url: String(url) });
      });
    }

    return uniq(out, (x) => `${x.server}|${x.quality}|${x.url}`);
  };

  const normDownloads = (d) => {
    const out = [];
    const dl = d?.downloadUrl?.formats;

    // ✅ support JSON kamu: downloadUrl.formats[].qualities[].urls[]
    if (Array.isArray(dl)) {
      dl.forEach((fmt) => {
        const f = String(fmt?.title || "").trim();
        (Array.isArray(fmt?.qualities) ? fmt.qualities : []).forEach((q) => {
          const qt = String(q?.title || "").trim();
          (Array.isArray(q?.urls) ? q.urls : []).forEach((u) => {
            const url = u?.url;
            if (!url) return;
            const host = String(u?.title || "Link").trim();
            out.push({ label: [f, qt, host].filter(Boolean).join(" • "), url: String(url) });
          });
        });
      });
      return uniq(out, (x) => x.url);
    }

    // fallback lama (kalau ada)
    const list = pick(d?.downloadList, d?.downloads, d?.download) || [];
    if (Array.isArray(list)) {
      list.forEach((it) => {
        const url = it?.url || it?.link;
        if (url) out.push({ label: String(it?.quality || it?.label || "Link").trim(), url: String(url) });
        else if (Array.isArray(it?.links)) {
          const q = String(it?.quality || it?.label || "Link").trim();
          it.links.forEach((l) => {
            const u = l?.url || l?.link;
            if (!u) return;
            out.push({ label: `${q} - ${String(l?.server || l?.name || "Server").trim()}`, url: String(u) });
          });
        }
      });
    }
    return uniq(out, (x) => x.url);
  };

  const getEmbed = (d) =>
    pick(d?.defaultStreamingUrl, d?.embedUrl, d?.embed_url, d?.iframeUrl, d?.playerUrl, d?.streamUrl, d?.videoUrl, d?.url);

  // ---------- UI builders ----------
  const menuTitle = (t) => `<div class="dropdown-title">${t}</div>`;
  const menuEmpty = (t) => `<div class="dropdown-empty">${t}</div>`;

  const renderMenuButtons = (root, title, items, active, onPick) => {
    if (!root) return;
    root.innerHTML = menuTitle(title);
    if (!items.length) return (root.innerHTML += menuEmpty("Tidak tersedia"));
    items.forEach((x) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "dropdown-item" + (x === active ? " active" : "");
      b.textContent = x;
      b.onclick = () => onPick(x);
      root.appendChild(b);
    });
  };

  const renderDownloads = (list) => {
    if (!el.downloadMenu) return;
    el.downloadMenu.innerHTML = menuTitle("Link Unduh");
    if (!list.length) return (el.downloadMenu.innerHTML += menuEmpty("Link unduh tidak tersedia"));
    list.forEach((d) => {
      const a = document.createElement("a");
      a.className = "dropdown-item";
      a.href = d.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = d.label;
      el.downloadMenu.appendChild(a);
    });
  };

  // ---------- chips (kecil -> besar) ----------
  const epNum = (t, fb) => {
    const m = String(t || "").match(/(\d+)(?!.*\d)/);
    return m ? +m[1] : fb;
  };

  const renderChips = (list) => {
    if (!el.chip) return;
    el.chip.innerHTML = "";
    if (!Array.isArray(list) || !list.length) return el.chip.parentElement?.classList.add("hidden");

    const items = list
      .map((it, i) => {
        const href = it?.href;
        if (!href) return null;
        const epSlug = href.split("/").filter(Boolean).pop();
        return { epSlug, num: epNum(it?.title, i + 1) };
      })
      .filter(Boolean)
      .sort((a, b) => a.num - b.num); // ✅ kecil -> besar

    items.forEach(({ epSlug, num }) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "episode-chip" + (epSlug === slug ? " active" : "");
      b.textContent = String(num || "?");
      b.onclick = () => (epSlug === slug ? 0 : (location.href = `/anime/episode?slug=${enc(epSlug)}`));
      el.chip.appendChild(b);
    });

    el.chip.querySelector(".episode-chip.active")?.scrollIntoView?.({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  // ---------- clipboard/share ----------
  const copy = async (text) => {
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

  // ---------- fetch server stream url (penting untuk kualitas) ----------
  async function fetchServerUrl(href) {
    // href contoh: "/samehadaku/server/XXXX" -> route api: "/anime/samehadaku/server/XXXX"
    if (!href) return "";
    const id = href.split("/").filter(Boolean).pop();
    if (!id) return "";
    try {
      const j = await apiGet(`/anime/samehadaku/server/${enc(id)}`);
      const d = j?.status === "success" ? j.data : null;
      return String(pick(d?.url, d?.streamUrl, d?.iframeUrl, d?.embedUrl, d?.src, d?.link) || "");
    } catch {
      return "";
    }
  }

  // ---------- main ----------
  async function loadEpisode() {
    if (!slug) return toast("Slug episode tidak ditemukan");

    let j;
    try {
      j = await apiGet(`/anime/samehadaku/episode/${enc(slug)}`);
    } catch {
      return toast("Gagal memuat episode.");
    }

    const d = j?.status === "success" ? j.data : null;
    if (!d) return toast("Episode tidak ditemukan.");

    const title = String(pick(d?.title, d?.episodeTitle, "Episode")).trim();
    if (el.title) el.title.textContent = title || "Episode";
    document.title = `AniKuy - ${title || "Episode"}`;

    const embed = getEmbed(d);
    if (el.player) el.player.src = embed ? String(embed) : "";

    // ✅ chips episode FIX: pakai recommendedEpisodeList (karena response episode tidak ada episodeList)
    renderChips(d?.recommendedEpisodeList || []);

    // ✅ streams (kualitas/server)
    let streams = normStreams(d);

    // jika kosong tapi ada structure "server.qualities" (seperti JSON kamu) -> build stream list via fetch server endpoint
    if (!streams.length && Array.isArray(d?.server?.qualities)) {
      const jobs = [];
      d.server.qualities.forEach((q) => {
        const qName = String(q?.title || "Auto").trim();
        (Array.isArray(q?.serverList) ? q.serverList : []).forEach((s) => {
          const sName = String(s?.title || "Server").trim();
          const href = s?.href;
          jobs.push(
            fetchServerUrl(href).then((url) => url && streams.push({ server: sName, quality: qName, url }))
          );
        });
      });
      await Promise.all(jobs);
      streams = uniq(streams, (x) => `${x.server}|${x.quality}|${x.url}`);
    }

    const servers = [...new Set(streams.map((x) => x.server))];
    const qualitiesOf = (srv) => [...new Set(streams.filter((x) => x.server === srv).map((x) => x.quality))];
    const findStream = (srv, q) =>
      streams.find((x) => x.server === srv && x.quality === q) ||
      streams.find((x) => x.server === srv) ||
      streams[0];

    let activeServer = servers[0] || "Auto";
    let activeQuality = qualitiesOf(activeServer)[0] || "Auto";

    const apply = (srv, q) => {
      const s = findStream(srv, q);
      if (!s) return;

      activeServer = s.server;
      activeQuality = s.quality;

      if (el.serverLabel) el.serverLabel.textContent = activeServer;
      if (el.qualityLabel) el.qualityLabel.textContent = activeQuality;
      if (el.player && s.url) el.player.src = s.url;

      renderMenuButtons(el.serverMenu, "Pilih Server", servers, activeServer, (sv) => {
        const qs = qualitiesOf(sv);
        apply(sv, qs[0] || "Auto");
        closePanels();
      });

      renderMenuButtons(el.qualityMenu, "Pilih Kualitas", qualitiesOf(activeServer), activeQuality, (qq) => {
        apply(activeServer, qq);
        closePanels();
      });
    };

    if (streams.length) apply(activeServer, activeQuality);
    else {
      if (el.serverLabel) el.serverLabel.textContent = "Auto";
      if (el.qualityLabel) el.qualityLabel.textContent = "Auto";
      renderMenuButtons(el.serverMenu, "Pilih Server", [], "", () => {});
      renderMenuButtons(el.qualityMenu, "Pilih Kualitas", [], "", () => {});
    }

    // downloads
    renderDownloads(normDownloads(d));

    // bind toolbar
    el.serverBtn && (el.serverBtn.onclick = () => toggle(el.serverMenu));
    el.qualityBtn && (el.qualityBtn.onclick = () => toggle(el.qualityMenu));
    el.downloadBtn && (el.downloadBtn.onclick = () => toggle(el.downloadMenu));
    el.shareBtn &&
      (el.shareBtn.onclick = async () => {
        closePanels();
        const url = location.href;
        if (navigator.share) {
          try {
            await navigator.share({ title: document.title, url });
            return;
          } catch {}
        }
        copy(url);
      });
  }

  document.addEventListener("DOMContentLoaded", loadEpisode);
})();
