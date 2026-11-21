(() => {
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  if ("IntersectionObserver" in window && Element.prototype.animate) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          if (reducedMotion.matches) continue;
          entry.target.animate(
            [
              { opacity: 0, transform: "translateY(12px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
            { duration: 420, easing: "cubic-bezier(0.2, 0.75, 0.25, 1)" }
          );
        }
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll("[data-reveal]").forEach((element) => observer.observe(element));
  }

  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) {
      document.getAnimations?.().forEach((animation) => animation.finish());
    }
  });

  const toast = document.getElementById("toast");
  const copyTimers = new WeakMap();
  let toastTimer;

  const showToast = (message) => {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("show");
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
  };

  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copy);
      } catch (error) {
        console.warn("Could not copy contact details.", error);
        showToast("Couldn't copy. Select the text instead: " + button.dataset.copy);
        return;
      }

      showToast(button.dataset.label);
      button.classList.add("copied");
      button.querySelector(".copy-label").textContent = "Copied";
      clearTimeout(copyTimers.get(button));
      copyTimers.set(
        button,
        setTimeout(() => {
          button.classList.remove("copied");
          button.querySelector(".copy-label").textContent = "Copy";
        }, 2000)
      );
    });
  });

  document.getElementById("year").textContent = new Date().getFullYear();
})();
