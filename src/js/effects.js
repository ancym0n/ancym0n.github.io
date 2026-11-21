(() => {
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const site = (window.site = {});

  /* ---------- Smooth scrolling ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1 });
    const raf = (time) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }

  const scrollToTarget = (el) => {
    const pad = el.id === "top" ? 0 : parseFloat(getComputedStyle(el).paddingTop) - 96;
    const y = Math.max(0, el.getBoundingClientRect().top + scrollY + pad);
    if (lenis) lenis.scrollTo(y, { duration: 1.4 });
    else scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
  };

  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const target = $(a.getAttribute("href"));
    if (!target) return;
    e.preventDefault();
    scrollToTarget(target);
    history.replaceState(null, "", a.getAttribute("href"));
  });

  /* ---------- Reveal on scroll ---------- */
  let started = false;
  const queue = [];
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );
  site.reveal = (el) => (started ? io.observe(el) : queue.push(el));
  $$("[data-reveal]").forEach(site.reveal);

  /* ---------- Intro ---------- */
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const fonts = Promise.race([document.fonts ? document.fonts.ready : 0, wait(1600)]);

  const intro = $(".intro");
  const playIntro = async () => {
    if (!intro) return;
    if (reduce || root.classList.contains("no-intro")) return intro.remove();
    try {
      sessionStorage.setItem("intro", "1");
    } catch (e) {}
    if (lenis) lenis.stop();
    await wait(1150);
    intro.classList.add("out");
    await wait(480);
    setTimeout(() => {
      intro.remove();
      if (lenis) lenis.start();
    }, 450);
  };

  Promise.all([playIntro(), fonts]).then(() => {
    root.classList.add("ready");
    started = true;
    queue.forEach((el) => io.observe(el));
  });

  /* ---------- Nav, progress, parallax ---------- */
  const nav = $("#nav");
  const progress = $(".progress");
  const hero = $(".hero");
  const links = $$(".links a");
  const indicator = $(".indicator");
  let ticking = false;

  const onScroll = () => {
    ticking = false;
    const y = scrollY;
    const max = root.scrollHeight - innerHeight;
    progress.style.setProperty("--p", max > 0 ? Math.min(1, y / max).toFixed(4) : 0);
    nav.classList.toggle("scrolled", y > 24);
    if (!reduce && y < innerHeight * 1.5) hero.style.setProperty("--sy", y.toFixed(1));
  };
  addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScroll);
      }
    },
    { passive: true }
  );
  onScroll();

  const moveIndicator = (link) => {
    if (!link) return indicator.classList.remove("on");
    indicator.style.setProperty("--x", link.offsetLeft + "px");
    indicator.style.setProperty("--w", link.offsetWidth + "px");
    indicator.classList.add("on");
  };
  let activeLink = null;
  const setActive = (name) => {
    activeLink = links.find((a) => a.dataset.link === name) || null;
    links.forEach((a) => a.classList.toggle("active", a === activeLink));
    moveIndicator(activeLink);
  };
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
        else if (activeLink && activeLink.dataset.link === entry.target.id) setActive(null);
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  ["work", "about", "contact"].forEach((id) => sectionObserver.observe($("#" + id)));
  addEventListener("resize", () => moveIndicator(activeLink));

  /* ---------- Pointer effects ---------- */
  const tilt = $("#tilt");
  const ambient = $(".ambient");
  const pointer = { x: innerWidth / 2, y: innerHeight * 0.35 };
  const cur = { x: pointer.x, y: pointer.y };
  let looping = false;

  const frame = () => {
    cur.x += (pointer.x - cur.x) * 0.08;
    cur.y += (pointer.y - cur.y) * 0.08;
    ambient.style.setProperty("--ax", cur.x.toFixed(1) + "px");
    ambient.style.setProperty("--ay", cur.y.toFixed(1) + "px");
    const nx = cur.x / innerWidth - 0.5;
    const ny = cur.y / innerHeight - 0.5;
    tilt.style.setProperty("--ry", (nx * 18).toFixed(2) + "deg");
    tilt.style.setProperty("--rx", (-ny * 14).toFixed(2) + "deg");
    tilt.style.setProperty("--tx", (nx * 14).toFixed(1) + "px");
    tilt.style.setProperty("--ty", (ny * 10).toFixed(1) + "px");
    if (Math.abs(pointer.x - cur.x) > 0.2 || Math.abs(pointer.y - cur.y) > 0.2) {
      requestAnimationFrame(frame);
    } else {
      looping = false;
    }
  };

  if (finePointer && !reduce) {
    addEventListener(
      "pointermove",
      (e) => {
        pointer.x = e.clientX;
        pointer.y = e.clientY;
        if (!looping) {
          looping = true;
          requestAnimationFrame(frame);
        }
      },
      { passive: true }
    );

    $$(".magnetic").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--tx", ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) + "px");
        el.style.setProperty("--ty", ((e.clientY - r.top - r.height / 2) * 0.32).toFixed(1) + "px");
      });
      el.addEventListener("pointerleave", () => {
        el.style.setProperty("--tx", "0px");
        el.style.setProperty("--ty", "0px");
      });
    });

    $("#projects").addEventListener("pointermove", (e) => {
      const card = e.target.closest(".card");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", e.clientX - r.left + "px");
      card.style.setProperty("--my", e.clientY - r.top + "px");
    });
  } else {
    ambient.style.display = "none";
  }

  const avatar = $("#avatar");
  avatar.addEventListener("click", () => {
    avatar.classList.remove("squish");
    void avatar.offsetWidth;
    avatar.classList.add("squish");
  });
  avatar.addEventListener("animationend", () => avatar.classList.remove("squish"));

  /* ---------- Stats (filled in by projects.js) ---------- */
  const values = {};
  const seen = new WeakSet();
  const countUp = (el, to, plain) => {
    const from = plain ? to - 8 : 0;
    if (reduce) {
      el.textContent = plain ? to : to.toLocaleString("en-US");
      return;
    }
    const duration = 1600;
    const t0 = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      const v = Math.round(from + (to - from) * eased);
      el.textContent = plain ? v : v.toLocaleString("en-US");
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const statObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        statObserver.unobserve(el);
        seen.add(el);
        const v = values[el.dataset.count];
        if (v != null) countUp(el, v, "plain" in el.dataset);
      });
    },
    { threshold: 0.6 }
  );
  $$("[data-count]").forEach((el) => statObserver.observe(el));
  site.setStats = (stats) => {
    Object.assign(values, stats);
    $$("[data-count]").forEach((el) => {
      const v = values[el.dataset.count];
      if (v == null) return;
      if (seen.has(el)) countUp(el, v, "plain" in el.dataset);
      else el.textContent = "plain" in el.dataset ? v : v.toLocaleString("en-US");
    });
  };

  /* ---------- Clock ---------- */
  const timeEl = $("#time");
  const timeFmt = new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const tickClock = () => {
    timeEl.textContent = timeFmt.format(new Date());
    setTimeout(tickClock, 60000 - (Date.now() % 60000) + 50);
  };
  tickClock();

  /* ---------- Marquee ---------- */
  const words = ["JavaScript", "Node.js", "Python", "HTML & CSS", "Automation", "Discord bots", "Minecraft bots", "UI design"];
  const track = $("#marquee");
  const half = () => {
    const group = document.createElement("div");
    group.style.display = "flex";
    words.forEach((w) => {
      const s = document.createElement("span");
      s.textContent = w;
      group.append(s);
    });
    return group;
  };
  track.append(half(), half(), half(), half());

  /* ---------- Copy ---------- */
  const toast = $("#toast");
  let toastTimer;
  const showToast = (msg) => {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
  };
  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.append(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    }
  };
  $$("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const ok = await copyText(btn.dataset.copy);
      showToast(ok ? btn.dataset.label : "Couldn’t copy — " + btn.dataset.copy);
      if (!ok) return;
      btn.classList.add("copied");
      setTimeout(() => btn.classList.remove("copied"), 1800);
    });
  });

  $("#year").textContent = new Date().getFullYear();
})();
