(() => {
  const CONFIG_URL = "src/projects.json";
  const CACHE_TTL = 15 * 60 * 1000;
  const INITIAL_LIMIT = 6;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const grid = document.getElementById("projects");
  const filters = document.getElementById("filters");
  const note = document.getElementById("projects-note");
  const status = document.getElementById("projects-status");
  const more = document.getElementById("more");

  const LANGUAGE_COLORS = {
    JavaScript: "#e0c779",
    TypeScript: "#78a2c4",
    Python: "#8eafc5",
    HTML: "#d9987c",
    CSS: "#af9fc3",
    Shell: "#a5b98a",
    Java: "#c7a17c",
    Go: "#8fbabc",
    Rust: "#c18e79",
    "C#": "#97b28c",
    "C++": "#c998ac",
  };

  const element = (tag, attrs = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value == null) continue;
      if (key === "text") node.textContent = value;
      else node.setAttribute(key, value);
    }
    children.flat().forEach((child) => {
      if (child != null) node.append(child);
    });
    return node;
  };

  const icon = (path) => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    const shape = document.createElementNS(svg.namespaceURI, "path");
    shape.setAttribute("d", path);
    svg.append(shape);
    return svg;
  };
  const arrow = () => icon("M7 17 17 7M7 7h10v10");

  const prettyName = (name) => {
    const spaced = name.replace(/[-_]+/g, " ").trim();
    return spaced === spaced.toLowerCase() ? spaced.replace(/\b\w/g, (letter) => letter.toUpperCase()) : spaced;
  };

  const cleanUrl = (value) => {
    if (!value) return null;
    try {
      const text = value.trim();
      const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(text) ? text : "https://" + text);
      if (!["https:", "http:"].includes(url.protocol)) throw new Error("Unsupported URL protocol");
      if (/(^|\.)ancymon\.dev$|\.github\.io$/.test(url.hostname)) url.protocol = "https:";
      return url.href;
    } catch (error) {
      console.warn("Ignoring an invalid project URL.", error);
      return null;
    }
  };

  const fetchJSON = async (url) => {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("Request failed: " + response.status + " " + url);
    return response.json();
  };

  const readCache = (key) => {
    try {
      const value = localStorage.getItem(key);
      if (!value) return null;
      const cached = JSON.parse(value);
      if (!Array.isArray(cached?.repos) || !Number.isFinite(cached.t)) throw new Error("Invalid project cache");
      return cached;
    } catch (error) {
      console.warn("Could not read the project cache.", error);
      return null;
    }
  };

  const load = async (config) => {
    const key = "ancymon:repos:v2:" + config.user;
    const cached = readCache(key);
    if (cached && Date.now() - cached.t < CACHE_TTL) return cached;

    try {
      const repos = await fetchJSON("https://api.github.com/users/" + encodeURIComponent(config.user) + "/repos?per_page=100&sort=pushed");
      const data = {
        t: Date.now(),
        repos: repos.map((repo) => ({
          name: repo.name,
          description: repo.description,
          homepage: repo.homepage,
          url: repo.html_url,
          language: repo.language,
          stars: repo.stargazers_count,
          pushed: repo.pushed_at,
          fork: repo.fork,
        })),
      };
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (error) {
        console.warn("Could not save the project cache.", error);
      }
      return data;
    } catch (error) {
      console.warn("GitHub is unavailable. Using saved projects.", error);
      return { ...(cached || config.snapshot), stale: true };
    }
  };

  const toProjects = (repos, config) =>
    repos
      .filter((repo) => !repo.fork && !(config.exclude || []).includes(repo.name))
      .map((repo) => {
        const override = config.overrides?.[repo.name] || {};
        return {
          title: override.title || prettyName(repo.name),
          description: override.description ?? repo.description,
          homepage: cleanUrl(override.homepage ?? repo.homepage),
          url: cleanUrl(repo.url),
          language: repo.language,
          stars: repo.stars || 0,
          pushed: repo.pushed,
          featured: !!override.featured,
        };
      })
      .filter((project) => project.url)
      .sort((a, b) => b.featured - a.featured || b.stars - a.stars || new Date(b.pushed) - new Date(a.pushed));

  const projectLink = (href, label, title, secondary = false) =>
    element(
      "a",
      { class: "text-link" + (secondary ? " secondary" : ""), href, target: "_blank", rel: "noopener", "aria-label": label + ": " + title },
      label,
      arrow()
    );

  const renderProject = (project, index) => {
    const meta = element("ul", { class: "project-meta" });
    if (project.language) {
      const dot = element("i", { "aria-hidden": "true" });
      dot.style.setProperty("--language-color", LANGUAGE_COLORS[project.language] || "var(--accent)");
      meta.append(element("li", {}, dot, project.language));
    }
    if (project.stars > 0) {
      meta.append(
        element(
          "li",
          { "aria-label": project.stars + " stars on GitHub" },
          icon("m12 3.6 2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8L6.7 20l1-6-4.4-4.2 6-.9z"),
          String(project.stars)
        )
      );
    }

    const actions = element("div", { class: "project-actions" });
    if (project.homepage) actions.append(projectLink(project.homepage, "Visit site", project.title));
    actions.append(projectLink(project.url, "GitHub", project.title, !!project.homepage));

    return element(
      "article",
      { class: "project", "data-language": project.language || "Other" },
      element("span", { class: "project-number", "aria-hidden": "true", text: String(index + 1).padStart(2, "0") }),
      element(
        "div",
        { class: "project-copy" },
        element("h3", { class: "project-title" }, element("a", { href: project.homepage || project.url, target: "_blank", rel: "noopener", text: project.title })),
        project.description ? element("p", { class: "project-desc", text: project.description }) : null,
        meta.childElementCount ? meta : null
      ),
      actions
    );
  };

  const state = { language: "All", expanded: false };
  let projects = [];
  const matches = (project) => state.language === "All" || project.dataset.language === state.language;

  const applyFilter = (animate = true) => {
    const oldHeight = grid.getBoundingClientRect().height;
    const positions = new Map(projects.filter((project) => !project.hidden).map((project) => [project, project.getBoundingClientRect().top]));
    grid.getAnimations?.({ subtree: true }).forEach((animation) => animation.cancel());

    const matching = projects.filter(matches);
    const shown = state.expanded ? matching : matching.slice(0, INITIAL_LIMIT);
    const visible = new Set(shown);
    projects.forEach((project) => {
      project.hidden = !visible.has(project);
    });
    more.hidden = state.expanded || matching.length <= INITIAL_LIMIT;
    more.querySelector("span").textContent = "Show all " + matching.length + " projects";
    status.textContent = "Showing " + shown.length + " of " + matching.length + " projects.";

    if (!animate || reducedMotion.matches || !grid.animate) return;
    const options = { duration: 320, easing: "cubic-bezier(0.2, 0.75, 0.25, 1)" };
    const newHeight = grid.getBoundingClientRect().height;
    grid.animate([{ height: oldHeight + "px" }, { height: newHeight + "px" }], options);
    shown.forEach((project) => {
      const previousTop = positions.get(project);
      const offset = previousTop == null ? 10 : previousTop - project.getBoundingClientRect().top;
      project.animate(
        [
          { opacity: previousTop == null ? 0 : 1, transform: "translateY(" + offset + "px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        options
      );
    });
  };

  const renderFilters = (data) => {
    const counts = new Map();
    data.forEach((project) => {
      const language = project.language || "Other";
      counts.set(language, (counts.get(language) || 0) + 1);
    });
    filters.replaceChildren();
    if (counts.size < 2) return;
    const languages = ["All", ...[...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a))];
    languages.forEach((language) => {
      const count = language === "All" ? data.length : counts.get(language);
      const button = element(
        "button",
        { class: "filter", type: "button", "aria-pressed": String(language === state.language), "aria-controls": "projects" },
        language,
        element("small", { text: String(count) })
      );
      button.addEventListener("click", () => {
        if (state.language === language) return;
        state.language = language;
        filters.querySelectorAll("button").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
        applyFilter();
      });
      filters.append(button);
    });
  };

  const showNote = (message) => {
    note.textContent = message;
    note.hidden = !message;
  };

  const boot = async () => {
    grid.setAttribute("aria-busy", "true");
    grid.querySelector(".loading").hidden = false;
    try {
      const config = await fetchJSON(CONFIG_URL);
      const data = await load(config);
      const items = toProjects(data.repos, config);
      projects = items.map(renderProject);
      grid.replaceChildren(...projects);
      document.getElementById("project-count").textContent = String(items.length).padStart(2, "0");
      renderFilters(items);
      applyFilter(false);
      if (!items.length) showNote("No public projects to show yet.");
      else if (data.stale) showNote("GitHub is unavailable. Showing the last saved list.");
    } catch (error) {
      console.error("Could not load projects.", error);
      grid.replaceChildren();
      showNote("Projects couldn't be loaded. Use the All repositories link above to view them on GitHub.");
    } finally {
      grid.setAttribute("aria-busy", "false");
    }
  };

  more.addEventListener("click", () => {
    const next = projects.find((project) => matches(project) && project.hidden);
    state.expanded = true;
    applyFilter();
    next?.querySelector("h3 a").focus({ preventScroll: true });
  });

  boot();
})();
