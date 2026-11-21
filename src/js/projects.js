(() => {
  const CONFIG_URL = "src/projects.json";
  const CACHE_KEY = "ancymon:github:v1";
  const CACHE_TTL = 15 * 60 * 1000;
  const INITIAL_LIMIT = 9;

  const LANG_COLORS = {
    JavaScript: "#f1e05a",
    TypeScript: "#5b9bd5",
    Python: "#6aa2d8",
    HTML: "#e8663d",
    CSS: "#a77bd6",
    Shell: "#89e051",
    Java: "#e0903f",
    Go: "#5fc8d8",
    Rust: "#d99a7a",
    "C#": "#6fb06a",
    "C++": "#e06c9f",
  };

  const grid = document.getElementById("projects");
  const filtersEl = document.getElementById("filters");
  const note = document.getElementById("projects-note");
  const moreBtn = document.getElementById("more");
  const site = window.site || {};

  const ICONS = {
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.6 2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8L6.7 20l1-6-4.4-4.2 6-.9z"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    github:
      '<svg class="fill" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>',
  };

  /* ---------- Helpers ---------- */
  const h = (tag, attrs = {}, ...kids) => {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value == null || value === false) continue;
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else node.setAttribute(key, value);
    }
    kids.flat().forEach((kid) => kid != null && node.append(kid));
    return node;
  };
  const icon = (name) => {
    const span = document.createElement("span");
    span.style.display = "contents";
    span.innerHTML = ICONS[name];
    return span.firstElementChild;
  };

  const hash = (str) => {
    let n = 2166136261;
    for (let i = 0; i < str.length; i++) n = Math.imul(n ^ str.charCodeAt(i), 16777619);
    return n >>> 0;
  };

  const prettyName = (name) => {
    const spaced = name.replace(/[-_]+/g, " ").trim();
    return spaced === spaced.toLowerCase() ? spaced.replace(/\b\w/g, (c) => c.toUpperCase()) : spaced;
  };

  const cleanUrl = (value) => {
    if (!value) return null;
    try {
      const url = new URL(/^https?:\/\//i.test(value) ? value : "https://" + value);
      if (!/^https?:$/.test(url.protocol)) return null;
      if (/(^|\.)ancymon\.dev$|\.github\.io$/.test(url.hostname)) url.protocol = "https:";
      return url.href;
    } catch (e) {
      return null;
    }
  };
  const shortUrl = (href) => {
    const url = new URL(href);
    return (url.host + url.pathname).replace(/\/$/, "");
  };

  const timeAgo = (iso) => {
    const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    const units = [
      ["year", 31536000],
      ["month", 2592000],
      ["week", 604800],
      ["day", 86400],
      ["hour", 3600],
      ["minute", 60],
    ];
    for (const [unit, size] of units) {
      if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
    }
    return "just now";
  };

  /* ---------- Data ---------- */
  const fetchJSON = async (url) => {
    const res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
    if (!res.ok) throw new Error(url + " → " + res.status);
    return res.json();
  };

  const readCache = () => {
    try {
      return JSON.parse(localStorage.getItem(CACHE_KEY));
    } catch (e) {
      return null;
    }
  };
  const writeCache = (data) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), ...data }));
    } catch (e) {}
  };

  const pickRepo = (r) => ({
    name: r.name,
    description: r.description,
    homepage: r.homepage,
    url: r.html_url,
    language: r.language,
    stars: r.stargazers_count,
    pushed: r.pushed_at,
    fork: r.fork,
    archived: r.archived,
  });

  const load = async (config) => {
    const cached = readCache();
    if (cached && Date.now() - cached.t < CACHE_TTL) return { ...cached, source: "cache" };
    try {
      const base = "https://api.github.com/users/" + config.user;
      const [user, repos] = await Promise.all([fetchJSON(base), fetchJSON(base + "/repos?per_page=100&sort=pushed")]);
      const data = {
        user: { repos: user.public_repos, followers: user.followers, created: user.created_at },
        repos: repos.map(pickRepo),
      };
      writeCache(data);
      return { ...data, source: "live" };
    } catch (err) {
      console.warn("GitHub API unavailable, using saved data.", err);
      if (cached) return { ...cached, source: "stale" };
      return { ...config.snapshot, source: "snapshot" };
    }
  };

  const toProjects = (repos, config) => {
    const overrides = config.overrides || {};
    return repos
      .filter((r) => !r.fork && !(config.exclude || []).includes(r.name))
      .map((r) => {
        const o = overrides[r.name] || {};
        return {
          name: r.name,
          title: o.title || prettyName(r.name),
          description: o.description ?? r.description,
          homepage: cleanUrl(o.homepage ?? r.homepage),
          url: r.url,
          language: r.language,
          stars: r.stars || 0,
          pushed: r.pushed,
          featured: !!o.featured,
        };
      })
      .sort((a, b) => b.featured - a.featured || b.stars - a.stars || new Date(b.pushed) - new Date(a.pushed));
  };

  /* ---------- Rendering ---------- */
  const pill = (href, label, cls, trailing) =>
    h("a", { class: "pill " + cls, href, target: "_blank", rel: "noopener" }, h("span", { text: label }), trailing);

  const renderCard = (p, index) => {
    const mainUrl = p.homepage || p.url;
    const seed = hash(p.name);
    const cover = h(
      "div",
      { class: "cover", "aria-hidden": "true" },
      h(
        "div",
        { class: "win" },
        h(
          "div",
          { class: "win-bar" },
          h("i"),
          h("i"),
          h("i"),
          h("span", { class: "win-url", text: shortUrl(mainUrl) })
        ),
        h("div", { class: "win-body" }, h("div", { class: "win-title", text: p.title }), h("div", { class: "win-lines" }, h("b"), h("b")))
      )
    );
    cover.style.setProperty("--x1", (seed % 55) + 5 + "%");
    cover.style.setProperty("--y1", ((seed >> 5) % 40) - 10 + "%");
    cover.style.setProperty("--x2", 100 - ((seed >> 9) % 50) + "%");
    cover.style.setProperty("--y2", 70 + ((seed >> 14) % 50) + "%");

    const meta = h("ul", { class: "meta" });
    if (p.language) {
      const dot = h("i");
      dot.style.setProperty("--c", LANG_COLORS[p.language] || "#d19666");
      meta.append(h("li", {}, dot, p.language));
    }
    if (p.stars > 0) meta.append(h("li", {}, icon("star"), String(p.stars)));
    if (p.pushed) meta.append(h("li", {}, icon("clock"), timeAgo(p.pushed)));

    const actions = h("div", { class: "card-actions" });
    if (p.homepage) actions.append(pill(p.homepage, "Open site", "main", icon("arrow")));
    actions.append(pill(p.url, "GitHub", p.homepage ? "" : "main", icon("github")));

    const card = h(
      "article",
      { class: "card" },
      cover,
      h(
        "div",
        { class: "card-body" },
        h("h3", { class: "card-title" }, h("a", { href: mainUrl, target: "_blank", rel: "noopener", text: p.title }), icon("arrow")),
        h("p", { class: "card-desc" + (p.description ? "" : " empty"), text: p.description || "Source code and details on GitHub." }),
        meta
      ),
      actions
    );

    const cell = h("div", { class: "cell", "data-lang": p.language || "Other" }, card);
    cell.style.setProperty("--d", (index % 3) * 0.09 + "s");
    return cell;
  };

  const state = { lang: "All", expanded: false };
  let cells = [];

  const matches = (cell) => state.lang === "All" || cell.dataset.lang === state.lang;

  const apply = (animate) => {
    const visible = cells.filter(matches);
    const shown = new Set(state.expanded ? visible : visible.slice(0, INITIAL_LIMIT));
    const update = () => {
      let i = 0;
      cells.forEach((cell) => {
        const show = shown.has(cell);
        const wasHidden = cell.hidden;
        cell.hidden = !show;
        cell.classList.remove("leaving");
        if (!show) return;
        cell.style.setProperty("--d", (i++ % 3) * 0.09 + "s");
        if (wasHidden) {
          cell.classList.remove("in");
          void cell.offsetWidth;
          requestAnimationFrame(() => cell.classList.add("in"));
        }
      });
      moreBtn.hidden = state.expanded || visible.length <= INITIAL_LIMIT;
      moreBtn.firstElementChild.textContent = "Show all " + visible.length + " projects";
    };
    if (!animate) return update();
    cells.filter((c) => !c.hidden).forEach((c) => c.classList.add("leaving"));
    setTimeout(update, 220);
  };

  const renderFilters = (projects) => {
    const counts = {};
    projects.forEach((p) => {
      const lang = p.language || "Other";
      counts[lang] = (counts[lang] || 0) + 1;
    });
    const langs = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    filtersEl.replaceChildren();
    if (langs.length < 2) return;
    ["All", ...langs].forEach((lang) => {
      const total = lang === "All" ? projects.length : counts[lang];
      const btn = h("button", { class: "filter", type: "button", "aria-pressed": String(lang === state.lang) }, lang, h("small", { text: String(total) }));
      btn.addEventListener("click", () => {
        if (state.lang === lang) return;
        state.lang = lang;
        filtersEl.querySelectorAll(".filter").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
        apply(true);
      });
      filtersEl.append(btn);
    });
  };

  const showNote = (text) => {
    note.textContent = text;
    note.hidden = !text;
  };

  /* ---------- Boot ---------- */
  const boot = async () => {
    let config;
    try {
      config = await (await fetch(CONFIG_URL)).json();
    } catch (err) {
      grid.replaceChildren();
      grid.setAttribute("aria-busy", "false");
      showNote("Couldn’t load projects right now. See them all on github.com/ancym0n.");
      return;
    }

    const data = await load(config);
    const projects = toProjects(data.repos || [], config);

    cells = projects.map(renderCard);
    grid.replaceChildren(...cells);
    grid.setAttribute("aria-busy", "false");
    renderFilters(projects);
    apply(false);
    cells.forEach((cell) => site.reveal && site.reveal(cell));

    if (!projects.length) showNote("No public projects to show yet.");
    else if (data.source === "stale" || data.source === "snapshot") showNote("GitHub didn’t respond just now — showing the last saved list.");

    const user = data.user || {};
    const allRepos = (data.repos || []).filter((r) => !r.fork);
    if (site.setStats) {
      site.setStats({
        repos: user.repos ?? allRepos.length,
        stars: allRepos.reduce((sum, r) => sum + (r.stars || 0), 0),
        followers: user.followers ?? 0,
        since: user.created ? new Date(user.created).getFullYear() : undefined,
      });
    }
  };

  moreBtn.addEventListener("click", () => {
    state.expanded = true;
    apply(false);
  });

  boot();
})();
