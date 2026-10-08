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

  /* ---------- Services showcase ---------- */
  const SERVICES = {
    websites: {
      num: "01",
      title: "Websites & Landing Pages",
      lead: "Para negócios que precisam de presença profissional ou que rodam campanhas no Instagram, Google ou WhatsApp e querem transformar visitas em pedidos de orçamento.",
      price: "A partir de R$ 1.200",
      time: "1–2 semanas",
      status: "Vagas abertas",
      overview: [
        "Uma landing page existe para uma única missão: transformar cliques em contato. Trabalhamos a argumentação, a prova social e a chamada para ação para que cada visitante saiba exatamente o que fazer a seguir.",
        "Já os sites institucionais apresentam sua empresa com clareza e credibilidade, com páginas rápidas, bem estruturadas e fáceis de atualizar.",
      ],
      included: [
        "Copy orientado a conversão",
        "Prova social com depoimentos, resultados e selos",
        "Botão de WhatsApp e/ou formulário integrado",
        "Design responsivo mobile-first",
        "Otimização de velocidade de carregamento",
        "SEO on-page básico",
        "Integração com Google Analytics e Meta Pixel",
        "Uma rodada de ajustes pós-entrega",
      ],
      steps: [
        ["Descoberta", "Entendemos sua oferta, seu público e as objeções que impedem o “sim”. Esse diagnóstico vira o roteiro da página antes de qualquer decisão visual."],
        ["Lançamento", "Com a estrutura validada, entramos em design e desenvolvimento. Na entrega, conectamos o domínio, testamos em vários dispositivos e configuramos o rastreio das conversões."],
        ["Nossa abordagem", "Equilibramos velocidade de entrega com boas práticas de conversão. Cada elemento existe para responder a uma dúvida real do seu cliente."],
      ],
    },
    ecommerce: {
      num: "02",
      title: "E-commerce",
      lead: "Para marcas e pequenos negócios que querem vender online com catálogo, carrinho e pagamento próprios.",
      price: "A partir de R$ 3.500",
      time: "4–5 semanas",
      status: "Vagas abertas",
      overview: [
        "Uma loja virtual precisa apresentar bem o produto e remover qualquer obstáculo entre o “quero” e o “comprei”. Construímos a experiência pensando em toda a jornada, da vitrine ao checkout.",
        "A navegação facilita a descoberta dos produtos e o processo de compra reduz dúvidas e abandono de carrinho. Do outro lado, você recebe uma operação simples de administrar.",
      ],
      included: [
        "Catálogo com categorias e variações de produto",
        "Carrinho e checkout otimizados para conversão",
        "Pagamento com cartão, Pix e/ou boleto",
        "Cálculo de frete integrado",
        "Painel para produtos, estoque e pedidos",
        "Notificações automáticas de pedido",
        "Design responsivo mobile-first",
        "SEO on-page básico para produtos",
      ],
      steps: [
        ["Descoberta", "Mapeamos seu catálogo, as formas de pagamento e envio e como sua equipe vai gerenciar estoque e pedidos no dia a dia."],
        ["Lançamento", "Construímos catálogo, checkout e painel, testamos o fluxo de compra de ponta a ponta — com pagamento real — e acompanhamos os primeiros pedidos."],
        ["Nossa abordagem", "Cada etapa do checkout é um ponto onde a venda pode ser perdida. Por isso, simplificamos ao máximo o caminho até a confirmação da compra."],
      ],
    },
    sistemas: {
      num: "03",
      title: "Sistemas Sob Medida",
      lead: "Para empresas com processos internos que já não cabem em planilhas ou em ferramentas prontas.",
      price: "Sob consulta",
      time: "4–8 semanas",
      status: "Sob análise de escopo",
      overview: [
        "Sistemas sob medida resolvem o que nenhuma ferramenta pronta resolve sozinha: o jeito específico como o seu negócio funciona. Mapeamos a operação real para transformar gargalos em um fluxo digital claro.",
        "Construímos somente o que é necessário para apoiar a rotina, organizar informações e dar visibilidade às decisões — sem funcionalidades genéricas sobrando.",
      ],
      included: [
        "Workshop de descoberta do processo atual",
        "Modelagem de dados sob medida",
        "Painel administrativo com papéis de usuário",
        "Integrações com pagamentos, WhatsApp ou APIs",
        "Deploy e configuração do ambiente",
        "Treinamento da equipe",
        "Suporte no período pós-lançamento",
      ],
      steps: [
        ["Descoberta", "Entendemos o fluxo real de trabalho: quem faz o quê, onde estão os gargalos e quais decisões o sistema precisa apoiar."],
        ["Lançamento", "Desenvolvemos em ciclos curtos, entregando partes funcionais ao longo do projeto. No lançamento, treinamos a equipe e acompanhamos os primeiros dias de uso."],
        ["Nossa abordagem", "Começamos pelo problema, não pela tecnologia. Escolhemos a arquitetura mais simples que atende à necessidade real."],
      ],
    },
    seo: {
      num: "04",
      title: "SEO & Performance",
      lead: "Para quem já tem site, mas não aparece no Google — ou aparece atrás da concorrência.",
      price: "Sob consulta",
      time: "Plano mensal",
      status: "Vagas abertas",
      overview: [
        "Otimizamos a estrutura, o conteúdo e as palavras-chave do seu site para alcançar posições mais altas nos resultados de busca e ser encontrado por clientes em potencial.",
        "Também cuidamos da velocidade e da experiência da página: sites rápidos rankeiam melhor, convertem mais e passam mais confiança.",
      ],
      included: [
        "Auditoria técnica completa do site",
        "Pesquisa de palavras-chave do seu mercado",
        "Otimização on-page de títulos, textos e estrutura",
        "Melhoria de Core Web Vitals e velocidade",
        "Configuração do Google Search Console",
        "Otimização do Perfil da Empresa no Google",
        "Relatório mensal de posições e tráfego",
      ],
      steps: [
        ["Diagnóstico", "Analisamos seu site, sua concorrência e as buscas que seus clientes fazem para definir onde estão as maiores oportunidades."],
        ["Execução", "Aplicamos as correções técnicas e de conteúdo por ordem de impacto e acompanhamos a evolução das posições mês a mês."],
        ["Nossa abordagem", "Nada de truques: SEO consistente, baseado em conteúdo útil e em um site tecnicamente impecável, para resultados que se sustentam."],
      ],
    },
  };
  const SERVICE_IDS = Object.keys(SERVICES);

  const svc = document.querySelector(".svc");
  let openDrawer = () => {};
  let selectService = () => {};

  if (svc) {
    const items = [...svc.querySelectorAll(".svc__item")];
    const tabs = items.map((it) => it.querySelector(".svc__tab"));
    const frame = svc.querySelector(".svc__frame");
    const slides = [...svc.querySelectorAll(".svc__slide")];
    const counter = svc.querySelector(".svc__counter-cur");
    const AUTOPLAY_MS = 7000;
    const isStacked = () => window.matchMedia("(max-width: 900px)").matches;
    let current = 0;
    let timer = null;
    let started = 0;
    let remaining = AUTOPLAY_MS;
    let hovering = false;
    let inView = false;
    let userLocked = false;

    svc.style.setProperty("--svc-dur", `${AUTOPLAY_MS}ms`);

    const show = (index) => {
      if (index === current) return;
      const prev = current;
      current = index;

      items.forEach((it, i) => it.classList.toggle("is-active", i === index));
      tabs.forEach((t, i) => {
        t.setAttribute("aria-selected", String(i === index));
        t.tabIndex = i === index ? 0 : -1;
      });
      if (counter) counter.textContent = String(index + 1).padStart(2, "0");

      // Direction-aware wipe: the incoming slide must start hidden on the correct side
      const next = slides[index];
      frame.classList.add("no-anim");
      frame.dataset.dir = index > prev ? "down" : "up";
      slides.forEach((s, i) => {
        s.classList.remove("is-leaving");
        if (i !== index && i !== prev) s.classList.remove("is-active");
      });
      next.classList.remove("is-active");
      void next.offsetWidth;
      frame.classList.remove("no-anim");
      slides[prev].classList.remove("is-active");
      slides[prev].classList.add("is-leaving");
      next.classList.add("is-active");

      restartProgress();
    };

    // Autoplay with a progress line; pauses on hover, off-screen or hidden tab
    const restartProgress = () => {
      const line = items[current].querySelector(".svc__line i");
      line.style.animation = "none";
      void line.offsetWidth;
      line.style.animation = "";
      remaining = AUTOPLAY_MS;
      schedule();
    };

    const canPlay = () => !reduceMotion && !userLocked && inView && !hovering && !document.hidden && !isStacked();

    const schedule = () => {
      clearTimeout(timer);
      const playing = canPlay();
      svc.classList.toggle("is-autoplay", !reduceMotion && !userLocked && !isStacked());
      svc.classList.toggle("is-paused", !playing);
      if (!playing) return;
      started = performance.now();
      timer = setTimeout(() => show((current + 1) % items.length), remaining);
    };

    const pause = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
        remaining = Math.max(400, remaining - (performance.now() - started));
      }
      svc.classList.add("is-paused");
    };

    const lock = () => {
      userLocked = true;
      clearTimeout(timer);
      svc.classList.remove("is-autoplay", "is-paused");
    };

    selectService = (index, { userAction = true } = {}) => {
      if (userAction) lock();
      if (index === current && isStacked() && userAction) return;
      show(index);
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => selectService(i));
      tab.addEventListener("pointerenter", (e) => {
        // Hover previews without stopping autoplay (it resumes when the pointer leaves)
        if (e.pointerType === "mouse" && !isStacked()) show(i);
      });
      tab.addEventListener("keydown", (e) => {
        const map = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
        let to = null;
        if (e.key in map) to = (current + map[e.key] + items.length) % items.length;
        if (e.key === "Home") to = 0;
        if (e.key === "End") to = items.length - 1;
        if (to === null) return;
        e.preventDefault();
        selectService(to);
        tabs[to].focus();
      });
    });

    svc.addEventListener("pointerenter", () => {
      hovering = true;
      pause();
    });
    svc.addEventListener("pointerleave", () => {
      hovering = false;
      schedule();
    });
    document.addEventListener("visibilitychange", () => (document.hidden ? pause() : schedule()));
    window.addEventListener("resize", schedule);

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        ([entry]) => {
          inView = entry.isIntersecting;
          inView ? schedule() : pause();
        },
        { threshold: 0.35 }
      ).observe(svc);
    }

    // Subtle 3D tilt on the stage
    const stage = svc.querySelector(".svc__stage");
    if (stage && !reduceMotion) {
      stage.addEventListener("pointermove", (e) => {
        const r = stage.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        frame.style.setProperty("--ry", `${x * 6}deg`);
        frame.style.setProperty("--rx", `${y * -6}deg`);
      });
      stage.addEventListener("pointerleave", () => {
        frame.style.setProperty("--ry", "0deg");
        frame.style.setProperty("--rx", "0deg");
      });
    }

    svc.querySelector("[data-details-current]").addEventListener("click", (e) => {
      openDrawer(SERVICE_IDS[current], e.currentTarget);
    });
    svc.querySelectorAll("[data-details]").forEach((btn) => {
      btn.addEventListener("click", () => openDrawer(btn.dataset.details, btn));
    });

    schedule();
  }

  // Footer links open the matching service
  document.querySelectorAll("[data-open-service]").forEach((link) => {
    link.addEventListener("click", () => {
      const i = SERVICE_IDS.indexOf(link.dataset.openService);
      if (i >= 0) selectService(i);
    });
  });

  /* ---------- Service details drawer ---------- */
  const drawer = document.getElementById("svc-drawer");
  if (drawer && typeof drawer.showModal === "function") {
    const content = document.getElementById("drawer-content");
    const numEl = document.getElementById("drawer-num");
    let returnFocus = null;
    let closing = false;

    const esc = (str) => str.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

    const render = (id) => {
      const s = SERVICES[id];
      numEl.textContent = `Serviço ${s.num}`;
      content.innerHTML = `
        <h2 class="drawer__title" id="drawer-title">${esc(s.title)}</h2>
        <p class="drawer__lead">${esc(s.lead)}</p>
        <div class="drawer__img"><img src="assets/img/services/${id}.webp" alt="" width="2000" height="1250" /></div>
        <div class="drawer__stats">
          <div class="drawer__stat"><span>Investimento</span><b>${esc(s.price)}</b></div>
          <div class="drawer__stat"><span>Prazo</span><b>${esc(s.time)}</b></div>
          <div class="drawer__stat"><span>Agenda</span><b>${esc(s.status)}</b></div>
        </div>
        <h3 class="drawer__h">Visão geral</h3>
        <div class="drawer__text">${s.overview.map((p) => `<p>${esc(p)}</p>`).join("")}</div>
        <h3 class="drawer__h">O que está incluído</h3>
        <ul class="drawer__list">${s.included.map((li) => `<li>${esc(li)}</li>`).join("")}</ul>
        <h3 class="drawer__h">Como trabalhamos</h3>
        <div class="drawer__steps">${s.steps
          .map(([t, p], i) => `<div class="drawer__step"><i>0${i + 1}</i><div><b>${esc(t)}</b><p>${esc(p)}</p></div></div>`)
          .join("")}</div>
        <a href="#contato" class="btn btn--primary drawer__cta" data-cta="${id}">Quero este serviço</a>
        <h3 class="drawer__h">Outros serviços</h3>
        <div class="drawer__others">${SERVICE_IDS.filter((o) => o !== id)
          .map((o) => `<button type="button" class="drawer__other" data-switch="${o}">${esc(SERVICES[o].title)}</button>`)
          .join("")}</div>`;
      [...content.children].forEach((el, i) => el.style.setProperty("--i", i));
      drawer.querySelector(".drawer__inner").scrollTop = 0;
    };

    const close = () => {
      if (!drawer.open || closing) return;
      closing = true;
      drawer.classList.remove("is-open");
      const done = () => {
        drawer.close();
        closing = false;
        document.body.style.overflow = "";
        if (returnFocus) returnFocus.focus({ preventScroll: true });
      };
      if (reduceMotion || document.hidden) done();
      else setTimeout(done, 450);
    };

    openDrawer = (id, trigger) => {
      if (!SERVICES[id]) return;
      returnFocus = trigger || null;
      render(id);
      if (!drawer.open) {
        drawer.showModal();
        document.body.style.overflow = "hidden";
        requestAnimationFrame(() => requestAnimationFrame(() => drawer.classList.add("is-open")));
      } else {
        // Switching service inside the open drawer: replay the content stagger
        drawer.classList.remove("is-open");
        requestAnimationFrame(() => requestAnimationFrame(() => drawer.classList.add("is-open")));
      }
    };

    drawer.addEventListener("cancel", (e) => {
      e.preventDefault();
      close();
    });
    drawer.addEventListener("click", (e) => {
      if (e.target === drawer) close(); // backdrop
      if (e.target.closest("[data-close]")) close();
      const sw = e.target.closest("[data-switch]");
      if (sw) {
        openDrawer(sw.dataset.switch, returnFocus);
        selectService(SERVICE_IDS.indexOf(sw.dataset.switch));
      }
      const cta = e.target.closest("[data-cta]");
      if (cta) {
        e.preventDefault();
        const field = document.querySelector('#contact-form textarea[name="servico"]');
        if (field) field.value = SERVICES[cta.dataset.cta].title;
        returnFocus = null;
        close();
        setTimeout(() => {
          document.getElementById("contato").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
          document.querySelector('#contact-form input[name="nome"]')?.focus({ preventScroll: true });
        }, 300);
      }
    });
  }

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
