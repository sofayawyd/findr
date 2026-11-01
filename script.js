/* ==========================================================
   Findr — Lost & Found Dashboard
   ========================================================== */
(() => {
  "use strict";

  /* ---------- Config ---------- */
  const STORAGE_KEY = "findr.items.v1";
  const THEME_KEY = "findr.theme";

  const CATEGORIES = {
    Electronics: { emoji: "📱", color: "#5b5bf0" },
    Wallets:     { emoji: "👛", color: "#f0556a" },
    Keys:        { emoji: "🔑", color: "#f5a524" },
    Bags:        { emoji: "🎒", color: "#17b890" },
    Clothing:    { emoji: "🧥", color: "#a855f7" },
    Documents:   { emoji: "🪪", color: "#0ea5e9" },
    Other:       { emoji: "📦", color: "#8f99bd" },
  };

  /* ---------- Helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const icon = (name) => `<svg class="ic"><use href="#i-${name}"/></svg>`;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const iso = (d) => d.toISOString().slice(0, 10);
  const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
  const todayISO = () => iso(new Date());
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  const fmtDate = (s) => {
    const d = new Date(s + "T00:00:00");
    const diff = Math.round((new Date(todayISO() + "T00:00:00") - d) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    if (diff < 7 && diff > 0) return `${diff} days ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  /* ---------- Data ---------- */
  const seed = () => [
    { id: uid(), type: "lost",  title: "Black leather wallet", category: "Wallets", location: "Main Library, 2nd floor", date: daysAgo(0), description: "Black bifold wallet with student ID and two bank cards.", contact: "wallet.owner@mail.com", status: "open" },
    { id: uid(), type: "found", title: "Brown leather wallet", category: "Wallets", location: "Main Library, reading hall", date: daysAgo(0), description: "Found near the study desks. Has some cards inside.", contact: "helpdesk@campus.edu", status: "open" },
    { id: uid(), type: "lost",  title: "iPhone 14 Pro", category: "Electronics", location: "Cafeteria", date: daysAgo(1), description: "Space black, cracked corner on the case, blue cover.", contact: "+254 700 111 222", status: "open" },
    { id: uid(), type: "found", title: "Phone with blue case", category: "Electronics", location: "Cafeteria", date: daysAgo(1), description: "Black phone with a blue case found under a table.", contact: "security@campus.edu", status: "open" },
    { id: uid(), type: "found", title: "Car keys with red tag", category: "Keys", location: "Parking lot B", date: daysAgo(2), description: "Toyota key fob with a red tag and a small torch.", contact: "security@campus.edu", status: "open" },
    { id: uid(), type: "lost",  title: "Navy blue backpack", category: "Bags", location: "Lecture Hall 4", date: daysAgo(2), description: "Contains a laptop charger, notebooks and a water bottle.", contact: "bag.owner@mail.com", status: "open" },
    { id: uid(), type: "found", title: "Grey hoodie", category: "Clothing", location: "Sports complex", date: daysAgo(3), description: "Grey zip hoodie, size M, left near the gym entrance.", contact: "helpdesk@campus.edu", status: "open" },
    { id: uid(), type: "lost",  title: "National ID card", category: "Documents", location: "Admin block", date: daysAgo(4), description: "ID card in a clear plastic sleeve.", contact: "+254 711 333 444", status: "open" },
    { id: uid(), type: "found", title: "AirPods charging case", category: "Electronics", location: "Bus stop", date: daysAgo(4), description: "White case, no earbuds inside.", contact: "helpdesk@campus.edu", status: "resolved" },
    { id: uid(), type: "lost",  title: "House keys with keychain", category: "Keys", location: "Parking lot B", date: daysAgo(5), description: "Three keys on a silver ring with a football keychain.", contact: "keys.owner@mail.com", status: "resolved" },
    { id: uid(), type: "found", title: "Black umbrella", category: "Other", location: "Lecture Hall 2", date: daysAgo(6), description: "Large black automatic umbrella.", contact: "helpdesk@campus.edu", status: "open" },
    { id: uid(), type: "lost",  title: "Prescription glasses", category: "Other", location: "Sports complex", date: daysAgo(6), description: "Round frame glasses in a green case.", contact: "+254 722 555 666", status: "open" },
  ];

  const load = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return seed();
  };
  const save = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items)); } catch (e) { /* ignore */ }
  };

  const state = {
    items: load(),
    view: "overview",
    type: "all",
    category: "all",
    sort: "new",
    query: "",
    reportType: "lost",
  };

  /* ---------- Matching ---------- */
  const STOP = new Set(["the", "a", "an", "with", "and", "of", "in", "my", "black", "blue", "brown", "grey", "red", "white"]);
  const words = (s) => s.toLowerCase().split(/\W+/).filter((w) => w.length > 2 && !STOP.has(w));

  const scoreMatch = (lost, found) => {
    if (lost.category !== found.category) return 0;
    let score = 45;
    const a = new Set(words(lost.title + " " + lost.description));
    const b = words(found.title + " " + found.description);
    const shared = b.filter((w) => a.has(w)).length;
    score += Math.min(shared * 10, 25);
    const locA = words(lost.location), locB = new Set(words(found.location));
    if (locA.some((w) => locB.has(w))) score += 20;
    if (lost.location.toLowerCase() === found.location.toLowerCase()) score += 5;
    const gap = Math.abs((new Date(lost.date) - new Date(found.date)) / 86400000);
    if (gap <= 2) score += 5;
    return Math.min(score, 99);
  };

  const getMatches = () => {
    const open = state.items.filter((i) => i.status === "open");
    const lost = open.filter((i) => i.type === "lost");
    const found = open.filter((i) => i.type === "found");
    const out = [];
    lost.forEach((l) => found.forEach((f) => {
      const s = scoreMatch(l, f);
      if (s >= 65) out.push({ lost: l, found: f, score: s });
    }));
    return out.sort((a, b) => b.score - a.score);
  };

  /* ---------- Rendering: Stats ---------- */
  const renderStats = () => {
    const items = state.items;
    const openLost = items.filter((i) => i.type === "lost" && i.status === "open").length;
    const openFound = items.filter((i) => i.type === "found" && i.status === "open").length;
    const resolved = items.filter((i) => i.status === "resolved").length;
    const rate = items.length ? Math.round((resolved / items.length) * 100) : 0;

    const week = (type, from, to) => items.filter((i) => i.type === type && i.date >= daysAgo(from) && i.date <= daysAgo(to)).length;
    const trend = (type) => {
      const cur = week(type, 6, 0), prev = week(type, 13, 7);
      if (!prev) return cur ? { t: "+100%", down: false } : { t: "0%", down: false };
      const p = Math.round(((cur - prev) / prev) * 100);
      return { t: `${p >= 0 ? "+" : ""}${p}%`, down: p < 0 };
    };
    const tl = trend("lost"), tf = trend("found");

    const cards = [
      { cls: "lost", ic: "search", val: openLost, label: "Open lost reports", trend: tl },
      { cls: "found", ic: "box", val: openFound, label: "Items in custody", trend: tf },
      { cls: "primary", ic: "check", val: resolved, label: "Returned to owners", trend: null },
      { cls: "warn", ic: "trend", val: rate + "%", label: "Recovery rate", trend: null },
    ];

    $("#stats").innerHTML = cards.map((c) => `
      <div class="stat">
        <div class="stat-top">
          <div class="stat-icon ${c.cls}">${icon(c.ic)}</div>
          ${c.trend ? `<span class="stat-trend ${c.trend.down ? "down" : ""}">${c.trend.t}</span>` : ""}
        </div>
        <div><strong>${c.val}</strong><span class="label">${c.label}</span></div>
      </div>`).join("");
  };

  /* ---------- Rendering: Chart ---------- */
  const renderChart = () => {
    const days = Array.from({ length: 7 }, (_, i) => daysAgo(6 - i));
    const data = days.map((d) => ({
      d,
      lost: state.items.filter((i) => i.date === d && i.type === "lost").length,
      found: state.items.filter((i) => i.date === d && i.type === "found").length,
    }));
    const max = Math.max(3, ...data.map((x) => Math.max(x.lost, x.found)));
    $("#chart").innerHTML = data.map((x, idx) => {
      const label = new Date(x.d + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" });
      const h = (v) => (v ? (v / max) * 100 : 1.5);
      return `
        <div class="bar-col">
          <div class="bars">
            <div class="bar lost"  data-v="${x.lost}"  style="height:${h(x.lost)}%;animation-delay:${idx * 60}ms"></div>
            <div class="bar found" data-v="${x.found}" style="height:${h(x.found)}%;animation-delay:${idx * 60 + 30}ms"></div>
          </div>
          <span class="bar-label">${label}</span>
        </div>`;
    }).join("");
  };

  /* ---------- Rendering: Donut ---------- */
  const renderDonut = () => {
    const counts = {};
    state.items.forEach((i) => { counts[i.category] = (counts[i.category] || 0) + 1; });
    const total = state.items.length;
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    let acc = 0;
    const stops = entries.map(([cat, n]) => {
      const start = acc;
      acc += (n / total) * 100;
      return `${CATEGORIES[cat].color} ${start}% ${acc}%`;
    });
    $("#donut").style.background = total ? `conic-gradient(${stops.join(",")})` : "var(--border)";
    $("#donutTotal").textContent = total;
    $("#donutLegend").innerHTML = entries.map(([cat, n]) =>
      `<li><i class="dot" style="background:${CATEGORIES[cat].color}"></i>${cat}<b>${n}</b></li>`).join("");
  };

  /* ---------- Rendering: Recent + Matches (overview) ---------- */
  const renderRecent = () => {
    const recent = [...state.items].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    $("#recentList").innerHTML = recent.map((i) => {
      const tagCls = i.status === "resolved" ? "resolved" : i.type;
      const tagTxt = i.status === "resolved" ? "resolved" : i.type;
      return `
      <div class="recent-row">
        <div class="cat-icon ${i.type}">${CATEGORIES[i.category].emoji}</div>
        <div class="recent-info">
          <strong>${esc(i.title)}</strong>
          <span>${icon("pin")} ${esc(i.location)} · ${fmtDate(i.date)}</span>
        </div>
        <span class="tag ${tagCls}">${tagTxt}</span>
      </div>`;
    }).join("") || `<p style="color:var(--muted)">No reports yet.</p>`;
  };

  const renderMatchMini = () => {
    const m = getMatches().slice(0, 3);
    $("#matchMini").innerHTML = m.length ? m.map((x) => `
      <div class="mini-match">
        <div class="pair">
          <b>${esc(x.lost.title)}</b>
          <small>↔ ${esc(x.found.title)}</small>
        </div>
        <div class="score" style="--p:${x.score}%"><span>${x.score}%</span></div>
      </div>`).join("") : `<p style="color:var(--muted);font-size:14px">No matches right now. New reports are compared automatically.</p>`;
  };

  /* ---------- Rendering: Items ---------- */
  const filteredItems = () => {
    const q = state.query.trim().toLowerCase();
    let list = state.items.filter((i) => {
      if (state.type === "resolved") { if (i.status !== "resolved") return false; }
      else if (state.type !== "all") { if (i.type !== state.type || i.status === "resolved") return false; }
      if (state.category !== "all" && i.category !== state.category) return false;
      if (q && !(`${i.title} ${i.location} ${i.category} ${i.description}`.toLowerCase().includes(q))) return false;
      return true;
    });
    if (state.sort === "new") list.sort((a, b) => b.date.localeCompare(a.date));
    if (state.sort === "old") list.sort((a, b) => a.date.localeCompare(b.date));
    if (state.sort === "az") list.sort((a, b) => a.title.localeCompare(b.title));
    return list;
  };

  const renderItems = () => {
    const list = filteredItems();
    $("#itemsSubtitle").textContent = `${list.length} item${list.length === 1 ? "" : "s"} shown`;
    $("#itemsGrid").innerHTML = list.length ? list.map((i) => {
      const resolved = i.status === "resolved";
      const cover = resolved ? "resolved" : i.type;
      return `
      <article class="item-card">
        <div class="item-cover ${cover}">
          <span class="tag ${cover}">${resolved ? "resolved" : i.type}</span>
          ${CATEGORIES[i.category].emoji}
        </div>
        <div class="item-body">
          <h4>${esc(i.title)}</h4>
          <p>${esc(i.description) || "No description provided."}</p>
          <div class="meta">
            <span>${icon("pin")} ${esc(i.location)}</span>
            <span>${icon("clock")} ${fmtDate(i.date)}</span>
            ${i.contact ? `<span>${icon("user")} ${esc(i.contact)}</span>` : ""}
          </div>
          <div class="item-actions">
            ${resolved
              ? `<button class="btn btn-sm btn-ghost" data-action="reopen" data-id="${i.id}">Reopen</button>`
              : `<button class="btn btn-sm btn-success" data-action="resolve" data-id="${i.id}">${icon("check")} Mark resolved</button>`}
            <button class="btn btn-sm btn-danger" data-action="delete" data-id="${i.id}" aria-label="Delete ${esc(i.title)}">${icon("trash")}</button>
          </div>
        </div>
      </article>`;
    }).join("") : `
      <div class="empty">
        <div class="big">🔍</div>
        <h4>No items found</h4>
        <p>Try a different filter or search term.</p>
      </div>`;
  };

  /* ---------- Rendering: Matches page ---------- */
  const renderMatches = () => {
    const m = getMatches();
    $("#matchesList").innerHTML = m.length ? m.map((x) => `
      <div class="match-card">
        <div class="match-side">
          <div class="cat-icon lost">${CATEGORIES[x.lost.category].emoji}</div>
          <div><span class="tag lost">lost</span><strong>${esc(x.lost.title)}</strong><span>${esc(x.lost.location)} · ${fmtDate(x.lost.date)}</span></div>
        </div>
        <div class="match-link">${icon("link")}</div>
        <div class="match-side">
          <div class="cat-icon found">${CATEGORIES[x.found.category].emoji}</div>
          <div><span class="tag found">found</span><strong>${esc(x.found.title)}</strong><span>${esc(x.found.location)} · ${fmtDate(x.found.date)}</span></div>
        </div>
        <div class="match-score">
          <div class="score" style="--p:${x.score}%;margin:auto"><span>${x.score}%</span></div>
          <small>match</small>
          <button class="btn btn-sm btn-success" style="margin-top:8px" data-action="confirm-match" data-lost="${x.lost.id}" data-found="${x.found.id}">Confirm</button>
        </div>
      </div>`).join("") : `
      <div class="empty" style="grid-column:auto">
        <div class="big">🧩</div>
        <h4>No matches yet</h4>
        <p>When a lost and found report look alike, they’ll show up here.</p>
      </div>`;
  };

  /* ---------- Sidebar counts ---------- */
  const renderCounts = () => {
    $("#navItemsCount").textContent = state.items.length;
    $("#navMatchCount").textContent = getMatches().length;
  };

  const renderAll = () => {
    renderStats(); renderChart(); renderDonut(); renderRecent(); renderMatchMini();
    renderItems(); renderMatches(); renderCounts();
  };

  /* ---------- Navigation ---------- */
  const setView = (view) => {
    state.view = view;
    $$(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${view}`));
    $$(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.view === view));
    closeSidebar();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const sidebar = $("#sidebar"), overlay = $("#overlay");
  const openSidebar = () => { sidebar.classList.add("open"); overlay.classList.add("show"); };
  const closeSidebar = () => { sidebar.classList.remove("open"); overlay.classList.remove("show"); };

  /* ---------- Toast ---------- */
  let toastTimer;
  const toast = (msg) => {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
  };

  /* ---------- Modal ---------- */
  const modal = $("#modal");
  const form = $("#itemForm");

  const setReportType = (type) => {
    state.reportType = type;
    $$("#typeToggle button").forEach((b) => b.classList.toggle("active", b.dataset.value === type));
  };
  const openModal = () => {
    form.reset();
    $("#fDate").value = todayISO();
    $("#fDate").max = todayISO();
    $("#formError").hidden = true;
    $$(".field.invalid").forEach((f) => f.classList.remove("invalid"));
    setReportType("lost");
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    setTimeout(() => $("#fTitle").focus(), 150);
  };
  const closeModal = () => {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const required = ["#fTitle", "#fCategory", "#fDate", "#fLocation"];
    let ok = true;
    required.forEach((sel) => {
      const el = $(sel);
      const bad = !el.value.trim();
      el.closest(".field").classList.toggle("invalid", bad);
      if (bad) ok = false;
    });
    const err = $("#formError");
    if (!ok) { err.textContent = "Please fill in all required fields."; err.hidden = false; return; }
    err.hidden = true;

    state.items.unshift({
      id: uid(),
      type: state.reportType,
      title: $("#fTitle").value.trim(),
      category: $("#fCategory").value,
      location: $("#fLocation").value.trim(),
      date: $("#fDate").value,
      description: $("#fDesc").value.trim(),
      contact: $("#fContact").value.trim(),
      status: "open",
    });
    save();
    renderAll();
    closeModal();
    toast(`${state.reportType === "lost" ? "Lost" : "Found"} item reported`);
  });

  /* ---------- Theme ---------- */
  const applyTheme = (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    $("#themeIcon").innerHTML = `<use href="#i-${theme === "dark" ? "sun" : "moon"}"/>`;
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* ignore */ }
  };

  /* ---------- Init & events ---------- */
  const init = () => {
    // Greeting
    const h = new Date().getHours();
    $("#greeting").textContent = `${h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"} 👋`;

    // Category selects
    const cats = Object.keys(CATEGORIES);
    $("#categoryFilter").innerHTML = `<option value="all">All categories</option>` + cats.map((c) => `<option>${c}</option>`).join("");
    $("#fCategory").innerHTML = cats.map((c) => `<option>${c}</option>`).join("");

    // Theme
    let theme = "light";
    try { theme = localStorage.getItem(THEME_KEY) || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); } catch (e) { /* ignore */ }
    applyTheme(theme);

    renderAll();
  };

  // Navigation
  $("#nav").addEventListener("click", (e) => {
    const btn = e.target.closest(".nav-item");
    if (btn) setView(btn.dataset.view);
  });
  document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-view-link]");
    if (link) setView(link.dataset.viewLink);
    if (e.target.closest("[data-open-modal]")) { closeSidebar(); openModal(); }
  });

  $("#openSidebar").addEventListener("click", openSidebar);
  $("#closeSidebar").addEventListener("click", closeSidebar);
  overlay.addEventListener("click", closeSidebar);

  // Theme toggle
  $("#themeToggle").addEventListener("click", () => {
    applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
  });

  // Filters
  $("#typeChips").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    state.type = chip.dataset.type;
    $$("#typeChips .chip").forEach((c) => c.classList.toggle("active", c === chip));
    renderItems();
  });
  $("#categoryFilter").addEventListener("change", (e) => { state.category = e.target.value; renderItems(); });
  $("#sortFilter").addEventListener("change", (e) => { state.sort = e.target.value; renderItems(); });

  // Search (jumps to items view)
  $("#globalSearch").addEventListener("input", (e) => {
    state.query = e.target.value;
    if (state.query && state.view !== "items") setView("items");
    renderItems();
  });

  // Item actions
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const { action, id } = btn.dataset;

    if (action === "resolve" || action === "reopen") {
      const it = state.items.find((i) => i.id === id);
      if (it) { it.status = action === "resolve" ? "resolved" : "open"; }
      save(); renderAll();
      toast(action === "resolve" ? "Marked as resolved 🎉" : "Item reopened");
    }
    if (action === "delete") {
      const it = state.items.find((i) => i.id === id);
      if (it && confirm(`Delete “${it.title}”?`)) {
        state.items = state.items.filter((i) => i.id !== id);
        save(); renderAll(); toast("Item deleted");
      }
    }
    if (action === "confirm-match") {
      [btn.dataset.lost, btn.dataset.found].forEach((mid) => {
        const it = state.items.find((i) => i.id === mid);
        if (it) it.status = "resolved";
      });
      save(); renderAll(); toast("Match confirmed — both items resolved 🎉");
    }
  });

  // Modal controls
  $("#closeModal").addEventListener("click", closeModal);
  $("#cancelModal").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  $("#typeToggle").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b) setReportType(b.dataset.value);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeModal(); closeSidebar(); }
  });

  init();
})();