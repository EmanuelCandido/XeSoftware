(() => {
  "use strict";

  // Número que recebe os contatos do formulário (formato internacional, só dígitos).
  const WHATSAPP_NUMBER = "5586999999999";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isDesktop = () => window.matchMedia("(min-width: 1025px)").matches;

  /* ---------- Text roll: duplicate label for the hover slide ---------- */
  document.querySelectorAll(".roll").forEach((el) => {
    const text = el.dataset.text || el.textContent.trim();
    el.textContent = "";
    const inner = document.createElement("span");
    inner.className = "roll__inner";
    const a = document.createElement("span");
    a.textContent = text;
    const b = document.createElement("span");
    b.textContent = text;
    b.setAttribute("aria-hidden", "true");
    inner.append(a, b);
    el.append(inner);
  });

  /* ---------- Hero intro ---------- */
  const hero = document.querySelector(".hero");
  if (hero) {
    const seq = [
      ...hero.querySelectorAll(".hero__badge"),
      ...hero.querySelectorAll(".hero__title .word, .hero__icon, .hero__highlight"),
      ...hero.querySelectorAll(".hero__text, .hero__actions"),
    ];
    seq.forEach((el, i) => {
      const target = el.classList.contains("word") ? el.firstElementChild : el;
      target.style.setProperty("--d", `${0.15 + i * 0.09}s`);
    });

    const base = 0.15 + seq.length * 0.09;
    hero.querySelectorAll(".proof__avatars img").forEach((img, i) => {
      img.style.setProperty("--d", `${base + 0.1 + i * 0.07}s`);
    });
    hero.querySelectorAll(".proof__stars span").forEach((star, i) => {
      star.style.setProperty("--d", `${base + 0.35 + i * 0.07}s`);
    });

    const start = () => requestAnimationFrame(() => hero.classList.add("is-loaded"));
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1200))]).then(start);
  }

  /* ---------- Scroll reveal ---------- */
  const revealEls = document.querySelectorAll("[data-reveal], .talk");

  // Stagger siblings that share a parent (cards, FAQ items...)
  const groups = new Map();
  document.querySelectorAll("[data-reveal]").forEach((el) => {
    const list = groups.get(el.parentElement) || [];
    list.push(el);
    groups.set(el.parentElement, list);
  });
  groups.forEach((list) => {
    if (list.length > 1) list.forEach((el, i) => el.style.setProperty("--d", `${i * 0.08}s`));
  });
  document.querySelectorAll(".talk__line > span").forEach((el, i) => {
    el.style.setProperty("--d", `${i * 0.14}s`);
  });

  if ("IntersectionObserver" in window && !reduceMotion) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px -6% 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
    if (hero) hero.classList.add("is-loaded");
  }

  /* ---------- Header, progress bar, hero parallax ---------- */
  const header = document.getElementById("header");
  const progress = document.createElement("div");
  progress.className = "progress";
  document.body.prepend(progress);

  const heroContent = document.querySelector(".hero__content");
  const offsetCol = document.querySelector(".projects__col--offset");
  let lastY = window.scrollY;
  let ticking = false;

  const onScroll = () => {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;

    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

    header.classList.toggle("is-scrolled", y > 40);
    const menuOpen = document.body.classList.contains("menu-open");
    header.classList.toggle("is-hidden", !menuOpen && y > 400 && y > lastY);
    lastY = y;

    if (!reduceMotion && heroContent && y < window.innerHeight * 1.2) {
      heroContent.style.transform = `translate3d(0, ${y * 0.25}px, 0)`;
      heroContent.style.opacity = String(Math.max(0, 1 - y / 700));
    }

    if (!reduceMotion && offsetCol) {
      if (isDesktop()) {
        const rect = offsetCol.parentElement.getBoundingClientRect();
        const center = rect.top + rect.height / 2 - window.innerHeight / 2;
        offsetCol.style.transform = `translate3d(0, ${center * -0.08}px, 0)`;
      } else {
        offsetCol.style.transform = "";
      }
    }

    ticking = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScroll);
      }
    },
    { passive: true }
  );
  window.addEventListener("resize", onScroll);
  onScroll();

  /* ---------- Active nav link ---------- */
  const navLinks = document.querySelectorAll(".nav__link");
  if ("IntersectionObserver" in window) {
    const sectionIo = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.id;
          navLinks.forEach((link) => link.classList.toggle("is-active", link.getAttribute("href") === `#${id}`));
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    ["servicos", "projetos", "faq", "contato"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) sectionIo.observe(el);
    });
  }

  /* ---------- Mobile menu ---------- */
  const burger = document.getElementById("burger");
  const mobileMenu = document.getElementById("mobile-menu");
  const setMenu = (open) => {
    document.body.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    mobileMenu.setAttribute("aria-hidden", String(!open));
    if (open) header.classList.remove("is-hidden");
  };
  burger.addEventListener("click", () => setMenu(!document.body.classList.contains("menu-open")));
  mobileMenu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setMenu(false);
  });

  /* ---------- Service cards: spotlight follows the cursor ---------- */
  document.querySelectorAll(".service-card").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });

  /* ---------- FAQ accordion with smooth height ---------- */
  document.querySelectorAll(".faq__item").forEach((item) => {
    const summary = item.querySelector("summary");
    const answer = item.querySelector(".faq__answer");
    let anim = null;

    summary.addEventListener("click", (e) => {
      e.preventDefault();
      if (anim) anim.cancel();

      const opening = !item.classList.contains("is-open");
      const startH = item.offsetHeight;

      if (opening) {
        item.open = true;
        item.classList.add("is-open");
      } else {
        item.classList.remove("is-open");
      }

      const endH = opening ? summary.offsetHeight + answer.offsetHeight : summary.offsetHeight;

      if (reduceMotion || document.hidden) {
        if (!opening) item.open = false;
        return;
      }

      item.style.overflow = "hidden";
      anim = item.animate(
        { height: [`${startH}px`, `${endH}px`] },
        { duration: 450, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
      );
      if (opening) {
        answer.animate(
          { opacity: [0, 1], transform: ["translateY(-8px)", "none"] },
          { duration: 450, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
        );
      }
      anim.onfinish = () => {
        if (!opening) item.open = false;
        item.style.overflow = "";
        anim = null;
      };
    });
  });

  /* ---------- Contact form -> WhatsApp ---------- */
  const form = document.getElementById("contact-form");
  const status = document.getElementById("form-status");
  const phoneInput = form.querySelector('input[name="whatsapp"]');

  phoneInput.addEventListener("input", () => {
    const d = phoneInput.value.replace(/\D/g, "").slice(0, 11);
    let out = d;
    if (d.length > 2) out = `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length > 7) out = `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    phoneInput.value = out;
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let valid = true;
    form.querySelectorAll("[required]").forEach((input) => {
      const ok = input.value.trim().length > 0;
      input.closest(".field").classList.toggle("is-invalid", !ok);
      if (!ok) valid = false;
    });

    if (!valid) {
      status.textContent = "Preencha seu nome e WhatsApp para continuar.";
      form.animate(
        { transform: ["translateX(0)", "translateX(-8px)", "translateX(8px)", "translateX(-4px)", "translateX(0)"] },
        { duration: 400 }
      );
      return;
    }

    const data = new FormData(form);
    const msg =
      `Olá, XE Software! Meu nome é ${data.get("nome")}.` +
      `\nWhatsApp: ${data.get("whatsapp")}` +
      (data.get("servico") ? `\nServiço: ${data.get("servico")}` : "");

    status.textContent = "Abrindo o WhatsApp...";
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
    form.reset();
  });
})();
