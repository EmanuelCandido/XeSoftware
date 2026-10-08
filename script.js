(() => {
  "use strict";

  // E-mail que recebe os contatos do formulário (envio via FormSubmit, sem servidor próprio).
  const CONTACT_EMAIL = "xesoftware.com.br@gmail.com";

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

  /* ---------- Header, hero parallax ---------- */
  const header = document.getElementById("header");

  const heroContent = document.querySelector(".hero__content");
  const offsetCol = document.querySelector(".projects__col--offset");
  let lastY = window.scrollY;
  let ticking = false;

  const onScroll = () => {
    const y = window.scrollY;

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
        // only ever moves up, so the column never overlaps the "ver todos" button below it
        offsetCol.style.transform = `translate3d(0, ${Math.min(0, center * -0.08)}px, 0)`;
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
  const IMG_V = "12";
  const serviceImg = (id, size = "") => `assets/img/services/${id}${size}.webp?v=${IMG_V}`;
  let openLightbox = () => {};

  const svc = document.querySelector(".svc");
  let openDrawer = () => {};
  let selectService = () => {};

  if (svc) {
    const items = [...svc.querySelectorAll(".svc__item")];
    const tabs = items.map((it) => it.querySelector(".svc__tab"));
    const frame = svc.querySelector(".svc__frame");
    const slides = [...svc.querySelectorAll(".svc__slide")];
    const isStacked = () => window.matchMedia("(max-width: 900px)").matches;
    let current = 0;
    let leavingTimer = null;

    const show = (index) => {
      if (index === current) return;
      const prev = current;
      current = index;

      items.forEach((it, i) => it.classList.toggle("is-active", i === index));
      tabs.forEach((t, i) => {
        t.setAttribute("aria-selected", String(i === index));
        t.tabIndex = i === index ? 0 : -1;
      });

      // Full-image crossfade: the old slide softly blurs out while the new one fades in on top
      clearTimeout(leavingTimer);
      slides.forEach((s, i) => s.classList.toggle("is-leaving", i === prev));
      slides[prev].classList.remove("is-active");
      slides[index].classList.add("is-active");
      leavingTimer = setTimeout(() => slides[prev].classList.remove("is-leaving"), 900);
    };

    selectService = (index) => {
      if (index === current && isStacked()) return;
      show(index);
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => selectService(i));
      tab.parentElement.addEventListener("pointerenter", (e) => {
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
      btn.addEventListener("click", () => {
        const i = SERVICE_IDS.indexOf(btn.dataset.details);
        if (i !== current) show(i);
        openDrawer(btn.dataset.details, btn);
      });
    });

    svc.querySelector("[data-zoom-current]").addEventListener("click", (e) => {
      const id = SERVICE_IDS[current];
      openLightbox(serviceImg(id), slides[current].querySelector("img").alt, e.currentTarget);
    });
    svc.querySelectorAll("[data-zoom]").forEach((btn) => {
      btn.addEventListener("click", () => openLightbox(serviceImg(btn.dataset.zoom), btn.querySelector("img").alt, btn));
    });
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
    const media = document.getElementById("drawer-media");
    const info = drawer.querySelector(".drawer__info");
    const numEl = document.getElementById("drawer-num");
    let returnFocus = null;
    let closing = false;

    const esc = (str) => str.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

    const render = (id) => {
      const s = SERVICES[id];
      numEl.textContent = `Serviço ${s.num}`;
      const alt = document.querySelector(`.svc__slide[data-service="${id}"] img`)?.alt || s.title;
      media.innerHTML = `
        <button type="button" class="zoomable" data-zoom-drawer="${id}" aria-label="Ampliar imagem">
          <img src="${serviceImg(id)}" alt="${esc(alt)}" width="2000" height="1250" />
</button>`;
      const stats = `
        <div class="drawer__stats">
          <div class="drawer__stat"><span>Investimento</span><b>${esc(s.price)}</b></div>
          <div class="drawer__stat"><span>Prazo</span><b>${esc(s.time)}</b></div>
          <div class="drawer__stat"><span>Agenda</span><b>${esc(s.status)}</b></div>
        </div>`;
      const overview = `
        <div class="drawer__block">
          <h3 class="drawer__h">Visão geral</h3>
          <div class="drawer__text">${s.overview.map((p) => `<p>${esc(p)}</p>`).join("")}</div>
        </div>`;
      const cta = `<a href="#contato" class="btn btn--primary drawer__cta" data-cta="${id}">Quero este serviço</a>`;

      // Desktop: cards, overview and CTA sit under the image. Mobile: they follow the title.
      media.insertAdjacentHTML(
        "beforeend",
        `<div class="drawer__side only-desktop">${stats}${overview}${cta}</div>`
      );
      content.innerHTML = `
        <h2 class="drawer__title" id="drawer-title">${esc(s.title)}</h2>
        <p class="drawer__lead">${esc(s.lead)}</p>
        <div class="only-mobile">${stats}${overview}</div>
        <h3 class="drawer__h">O que está incluído</h3>
        <ul class="drawer__list">${s.included.map((li) => `<li>${esc(li)}</li>`).join("")}</ul>
        <h3 class="drawer__h">Como trabalhamos</h3>
        <div class="drawer__steps">${s.steps
          .map(([t, p], i) => `<div class="drawer__step"><i>0${i + 1}</i><div><b>${esc(t)}</b><p>${esc(p)}</p></div></div>`)
          .join("")}</div>
        <div class="only-mobile">${cta}</div>
        <h3 class="drawer__h">Outros serviços</h3>
        <div class="drawer__others">${SERVICE_IDS.filter((o) => o !== id)
          .map((o) => `<button type="button" class="drawer__other" data-switch="${o}">${esc(SERVICES[o].title)}</button>`)
          .join("")}</div>`;
      [...media.children, ...info.children].forEach((el, i) => el.style.setProperty("--i", i));
      [...content.children].forEach((el, i) => el.style.setProperty("--i", i));
      drawer.querySelector(".drawer__inner").scrollTop = 0;
      info.scrollTop = 0;
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
      const zoom = e.target.closest("[data-zoom-drawer]");
      if (zoom) openLightbox(serviceImg(zoom.dataset.zoomDrawer), zoom.querySelector("img").alt, zoom);
      const sw = e.target.closest("[data-switch]");
      if (sw) {
        openDrawer(sw.dataset.switch, returnFocus);
        selectService(SERVICE_IDS.indexOf(sw.dataset.switch));
      }
      const cta = e.target.closest("[data-cta]");
      if (cta) {
        e.preventDefault();
        const field = document.querySelector('#contact-form select[name="tipo"]');
        const TIPO = { websites: "Landing Page", ecommerce: "Sites/E-commerce", sistemas: "Sistema sob medida", seo: "SEO & Performance" };
        if (field) {
          field.value = TIPO[cta.dataset.cta];
          field.closest(".field").classList.remove("is-invalid");
        }
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


  /* ---------- Image lightbox: click / wheel / pinch to zoom, drag to pan ---------- */
  const lb = document.getElementById("lightbox");
  if (lb && typeof lb.showModal === "function") {
    const stageEl = document.getElementById("lightbox-stage");
    const img = document.getElementById("lightbox-img");
    const pct = document.getElementById("lightbox-pct");
    const MIN = 1;
    const MAX = 5;
    let s = 1;
    let tx = 0;
    let ty = 0;
    let lbReturn = null;
    const pointers = new Map();
    let drag = null;
    let pinch = null;
    let moved = false;

    const apply = () => {
      // keep the image covering the viewport edges when zoomed (no empty gaps)
      const r = stageEl.getBoundingClientRect();
      const w = img.offsetWidth * s;
      const h = img.offsetHeight * s;
      const mx = Math.max(0, (w - r.width) / 2 + 40);
      const my = Math.max(0, (h - r.height) / 2 + 40);
      tx = Math.min(mx, Math.max(-mx, tx));
      ty = Math.min(my, Math.max(-my, ty));
      if (s <= 1.001) tx = ty = 0;
      img.style.setProperty("--s", s);
      img.style.setProperty("--tx", `${tx}px`);
      img.style.setProperty("--ty", `${ty}px`);
      pct.textContent = `${Math.round(s * 100)}%`;
      stageEl.classList.toggle("is-zoomed", s > 1.001);
    };

    // Zoom keeping the point (cx, cy) — in viewport px — fixed under the cursor
    const zoomTo = (next, cx, cy) => {
      next = Math.min(MAX, Math.max(MIN, next));
      const r = stageEl.getBoundingClientRect();
      const px = (cx ?? r.left + r.width / 2) - (r.left + r.width / 2);
      const py = (cy ?? r.top + r.height / 2) - (r.top + r.height / 2);
      tx = px - ((px - tx) * next) / s;
      ty = py - ((py - ty) * next) / s;
      s = next;
      apply();
    };

    const reset = () => {
      s = 1;
      tx = ty = 0;
      apply();
    };

    openLightbox = (src, alt, trigger) => {
      lbReturn = trigger || null;
      img.src = src;
      img.alt = alt || "";
      // Shows the regular image at once, then swaps in the high-resolution version for zooming
      const hi = new Image();
      const hiSrc = src.replace(".webp", "-xl.webp");
      hi.onload = () => {
        if (lb.open && img.src.endsWith(src.split("/").pop())) img.src = hiSrc;
      };
      hi.src = hiSrc;
      reset();
      lb.showModal();
      requestAnimationFrame(() => requestAnimationFrame(() => lb.classList.add("is-open")));
    };

    const closeLb = () => {
      if (!lb.open) return;
      lb.classList.remove("is-open");
      const done = () => {
        lb.close();
        if (lbReturn) lbReturn.focus({ preventScroll: true });
      };
      if (reduceMotion || document.hidden) done();
      else setTimeout(done, 300);
    };

    lb.addEventListener("cancel", (e) => {
      e.preventDefault();
      closeLb();
    });

    lb.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-lb]");
      if (!btn) return;
      const action = btn.dataset.lb;
      if (action === "close") closeLb();
      if (action === "in") zoomTo(s * 1.5);
      if (action === "out") zoomTo(s / 1.5);
      if (action === "reset") reset();
    });

    lb.addEventListener("keydown", (e) => {
      if (e.key === "+" || e.key === "=") zoomTo(s * 1.5);
      if (e.key === "-") zoomTo(s / 1.5);
      if (e.key === "0") reset();
    });

    stageEl.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        zoomTo(s * Math.exp(-e.deltaY * 0.0018), e.clientX, e.clientY);
      },
      { passive: false }
    );

    stageEl.addEventListener("pointerdown", (e) => {
      stageEl.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved = false;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s };
        drag = null;
        stageEl.classList.add("is-pinching");
      } else {
        drag = { x: e.clientX, y: e.clientY, tx, ty };
      }
    });

    stageEl.addEventListener("pointermove", (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        moved = true;
        zoomTo((pinch.s * d) / pinch.d, (a.x + b.x) / 2, (a.y + b.y) / 2);
        return;
      }
      if (drag) {
        const dx = e.clientX - drag.x;
        const dy = e.clientY - drag.y;
        if (!moved && Math.hypot(dx, dy) < 4) return;
        moved = true;
        if (s > 1.001) {
          stageEl.classList.add("is-dragging");
          tx = drag.tx + dx;
          ty = drag.ty + dy;
          apply();
        }
      }
    });

    const endPointer = (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      stageEl.classList.remove("is-dragging");
      if (pointers.size < 2) {
        pinch = null;
        stageEl.classList.remove("is-pinching");
      }
      if (e.type === "pointerup" && !moved && pointers.size === 0) {
        // Click: zoom in where clicked, or back to fit when already zoomed.
        // A click outside the image while not zoomed closes the viewer.
        const r = img.getBoundingClientRect();
        const onImg = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        if (s > 1.001) reset();
        else if (onImg) zoomTo(2.5, e.clientX, e.clientY);
        else closeLb();
      }
      if (pointers.size === 1) {
        const [p] = [...pointers.values()];
        drag = { x: p.x, y: p.y, tx, ty };
      } else if (pointers.size === 0) {
        drag = null;
      }
    };
    stageEl.addEventListener("pointerup", endPointer);
    stageEl.addEventListener("pointercancel", endPointer);
    window.addEventListener("resize", () => lb.open && apply());
  }

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
      status.textContent = "Preencha nome, WhatsApp e tipo de serviço para continuar.";
      form.animate(
        { transform: ["translateX(0)", "translateX(-8px)", "translateX(8px)", "translateX(-4px)", "translateX(0)"] },
        { duration: 400 }
      );
      return;
    }

    const data = new FormData(form);
    if (data.get("_honey")) return; // bot

    const nome = String(data.get("nome") || "").trim();
    const whatsapp = String(data.get("whatsapp") || "").trim();
    const tipo = String(data.get("tipo") || "").trim();
    const orcamento = String(data.get("orcamento") || "").trim();
    const descricao = String(data.get("descricao") || "").trim();
    const btn = form.querySelector(".form__submit");

    const setBusy = (busy) => {
      btn.disabled = busy;
      form.classList.toggle("is-sending", busy);
    };

    // Opens the visitor's e-mail app with everything filled in, if the online send fails
    const mailtoFallback = () => {
      const body = `Nome: ${nome}\nWhatsApp: ${whatsapp}\nServiço: ${tipo}\nOrçamento: ${orcamento || "—"}\nDescrição: ${descricao || "—"}`;
      window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Novo contato pelo site — " + nome)}&body=${encodeURIComponent(body)}`;
    };

    setBusy(true);
    status.className = "form__status";
    status.textContent = "Enviando...";

    fetch(`https://formsubmit.co/ajax/${CONTACT_EMAIL}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        _subject: `Novo contato pelo site — ${nome}`,
        _template: "table",
        _captcha: "false",
        Nome: nome,
        WhatsApp: whatsapp,
        Serviço: tipo,
        Orçamento: orcamento || "—",
        Descrição: descricao || "—",
      }),
    })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok || String(j.success) === "false") throw new Error(j.message || "falha");
        status.classList.add("is-ok");
        status.textContent = "Mensagem enviada! Entraremos em contato em breve.";
        form.reset();
      })
      .catch(() => {
        status.classList.add("is-error");
        status.textContent = "Não foi possível enviar agora. Abrindo seu aplicativo de e-mail...";
        setTimeout(mailtoFallback, 900);
      })
      .finally(() => setBusy(false));
  });

  /* ---------- Project previews: play only while on screen ---------- */
  const previews = document.querySelectorAll("video[data-preview]");
  if (previews.length && !reduceMotion && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ target, isIntersecting }) => {
          if (isIntersecting) target.play().catch(() => {});
          else target.pause();
        });
      },
      { threshold: 0.35 }
    );
    previews.forEach((v) => io.observe(v));
  }
})();
