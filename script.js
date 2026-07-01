/* =================================================================
   Museo + Biblioteca de Castro · Presentación al Concejo
   UI + motion (GSAP + ScrollTrigger, vendorizado local · offline)
   ================================================================= */
(function () {
  "use strict";

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  function fmt(n, dec) { return n.toLocaleString("es-CL", { minimumFractionDigits: dec, maximumFractionDigits: dec }); }

  /* ---------------- Fondos de render aleatorios (donde no hay foto) ---------------- */
  (function () {
    var bgImgs = $$(".scene__bg img");
    if (!bgImgs.length) return;
    var pool = [1, 2, 3, 4, 5, 6, 7];
    for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    var prev = -1;
    bgImgs.forEach(function (img, idx) {
      var n = pool[idx % pool.length];
      if (n === prev) n = pool[(idx + 3) % pool.length];
      prev = n;
      img.src = "assets/img/0" + n + ".jpeg";
    });
  })();

  /* ---------------- NAV: shrink + progreso ---------------- */
  var nav = $("#nav");
  var progress = $("#navProgress");
  function onScrollUI() {
    var y = window.pageYOffset;
    nav.classList.toggle("nav--shrink", y > 40);
    var h = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
  }
  var ticking = false;
  window.addEventListener("scroll", function () {
    if (!ticking) { requestAnimationFrame(function () { onScrollUI(); ticking = false; }); ticking = true; }
  }, { passive: true });
  window.addEventListener("resize", onScrollUI);
  onScrollUI();

  /* ---------------- NAV: capítulo activo ---------------- */
  var sections = $$(".scene");
  var navLinks = $$(".nav__link");
  var visibility = {};
  var chapterObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { visibility[e.target.id] = e.intersectionRatio; });
    var topId = null, top = 0;
    sections.forEach(function (s) {
      var r = visibility[s.id] || 0;
      if (r > top) { top = r; topId = s.id; }
    });
    if (!topId) return;
    var chapter = document.getElementById(topId).getAttribute("data-chapter");
    navLinks.forEach(function (l) {
      l.classList.toggle("is-active", l.getAttribute("data-chapter") === chapter);
    });
  }, { threshold: [0.1, 0.25, 0.5, 0.75] });
  sections.forEach(function (s) { chapterObserver.observe(s); });

  /* ---------------- Menú móvil ---------------- */
  var toggle = $(".nav__toggle");
  var menu = $("#navMenu");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var open = menu.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    menu.addEventListener("click", function (e) {
      if (e.target.classList.contains("nav__link")) {
        menu.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ================================================================
     MOTION · GSAP + ScrollTrigger
     Reveals con gsap.from()/fromTo() → contenido visible por defecto:
     sin JS, en headless o con reduced-motion ninguna sección queda en blanco.
     ================================================================ */
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    $$("[data-stair], .process__line").forEach(function (svg) {
      var p = svg.querySelector("path"); if (p) p.setAttribute("pathLength", "1");
    });

    var mm = gsap.matchMedia();

    /* ----- Con movimiento ----- */
    mm.add("(prefers-reduced-motion: no-preference)", function () {

      // HERO — entrada orquestada en carga
      var hero = gsap.timeline({ defaults: { ease: "expo.out" } });
      hero.from("#portada .scene__media--bleed img", { autoAlpha: 0, scale: 1.14, duration: 1.8, ease: "power2.out" }, 0)
          .from("#portada .eyebrow", { autoAlpha: 0, y: 18, duration: .8 }, 0.25)
          .from("#portada .hero__title span", { autoAlpha: 0, yPercent: 115, duration: 1, stagger: .12 }, 0.35)
          .from("#portada .hero__lede", { autoAlpha: 0, y: 24, duration: .9 }, 0.7)
          .from("#portada .hero__meta li", { autoAlpha: 0, y: 14, duration: .7, stagger: .08 }, 0.85)
          .from("#portada .scroll-cue", { autoAlpha: 0, y: -10, duration: .8 }, 1.0);
      gsap.set("#portada .stair-mark--hero path", { strokeDasharray: 1, strokeDashoffset: 1 });
      hero.to("#portada .stair-mark--hero path", { strokeDashoffset: 0, duration: 1.5, ease: "power2.inOut" }, 0.5);

      // Reveals por sección (texto/bloques) — los con motion propio se excluyen
      gsap.utils.toArray(".scene").forEach(function (scene) {
        if (scene.id === "portada") return;
        var items = scene.querySelectorAll("[data-reveal]:not(.gallery__item):not(.pillar)");
        if (!items.length) return;
        gsap.from(items, {
          scrollTrigger: { trigger: scene, start: "top 78%", once: true },
          autoAlpha: 0, y: 30, duration: .9, ease: "expo.out", stagger: .09
        });
      });

      // Galería — wipe por clip-path
      gsap.utils.toArray("#arquitectura .gallery__item").forEach(function (fig) {
        gsap.fromTo(fig,
          { clipPath: "inset(0 0 100% 0)", autoAlpha: 0, y: 14 },
          { clipPath: "inset(0 0 0% 0)", autoAlpha: 1, y: 0, duration: 1.05, ease: "expo.out",
            scrollTrigger: { trigger: fig, start: "top 86%", once: true } });
      });

      // Pilares — lift escalonado
      gsap.from("#pilares .pillar", {
        scrollTrigger: { trigger: "#pilares .pillars", start: "top 80%", once: true },
        autoAlpha: 0, y: 34, scale: .97, duration: .85, ease: "expo.out", stagger: .1 });

      // Comparación — entra desde los lados
      gsap.from("#riesgo .compare__col--good", { scrollTrigger: { trigger: "#riesgo .compare", start: "top 78%", once: true }, autoAlpha: 0, x: -44, duration: .9, ease: "expo.out" });
      gsap.from("#riesgo .compare__col--bad", { scrollTrigger: { trigger: "#riesgo .compare", start: "top 78%", once: true }, autoAlpha: 0, x: 44, duration: .9, ease: "expo.out" });

      // Barra de desglose — cada segmento "crece"
      gsap.from("#desglose .seg", {
        scrollTrigger: { trigger: "#desglose .breakdown__bar", start: "top 82%", once: true },
        scaleX: 0, transformOrigin: "left center", autoAlpha: 0, duration: .9, ease: "expo.out", stagger: .07 });

      // Clímax — el número se "ensambla"
      gsap.from("#costo .climax__num", {
        scrollTrigger: { trigger: "#costo", start: "top 68%", once: true },
        autoAlpha: 0, scale: 1.07, duration: .6, ease: "power2.out" });

      // Trazo de escaleras (clímax, acuerdo) + línea de proceso
      gsap.set("[data-stair]:not(.stair-mark--hero) path, .process__line path", { strokeDasharray: 1, strokeDashoffset: 1 });
      gsap.utils.toArray("[data-stair]:not(.stair-mark--hero), .process__line").forEach(function (svg) {
        var p = svg.querySelector("path"); if (!p) return;
        gsap.to(p, { strokeDashoffset: 0, duration: 1.4, ease: "power2.inOut",
          scrollTrigger: { trigger: svg, start: "top 88%", once: true } });
      });

      // Contadores (es-CL) al entrar
      $$("[data-count]").forEach(function (el) {
        var target = parseFloat(el.getAttribute("data-count"));
        var dec = parseInt(el.getAttribute("data-decimals") || "0", 10);
        if (isNaN(target)) return;
        el.textContent = fmt(0, dec);
        var obj = { v: 0 };
        gsap.to(obj, {
          v: target, duration: el.hasAttribute("data-grave") ? 1.9 : 1.25, ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 86%", once: true },
          onUpdate: function () { el.textContent = fmt(obj.v, dec); },
          onComplete: function () { el.textContent = fmt(target, dec); if (el.hasAttribute("data-grave")) el.classList.add("is-settled"); }
        });
      });

      // Parallax con scrub (masas + media a sangre; excluye el hero)
      gsap.utils.toArray("[data-parallax]").forEach(function (el) {
        if (el.closest("#portada")) return;
        var f = parseFloat(el.getAttribute("data-parallax")) || 0;
        gsap.fromTo(el, { yPercent: f * 60 }, {
          yPercent: -(f * 60), ease: "none",
          scrollTrigger: { trigger: el.closest(".scene") || el, start: "top bottom", end: "bottom top", scrub: true }
        });
      });
    });

    /* ----- Reduced-motion: cifras finales (el resto ya es visible) ----- */
    mm.add("(prefers-reduced-motion: reduce)", function () {
      $$("[data-count]").forEach(function (el) {
        var target = parseFloat(el.getAttribute("data-count"));
        var dec = parseInt(el.getAttribute("data-decimals") || "0", 10);
        if (!isNaN(target)) el.textContent = fmt(target, dec);
      });
    });

    // Recalcular posiciones tras cargar imágenes/fuentes
    window.addEventListener("load", function () { ScrollTrigger.refresh(); });

  } else {
    // Sin GSAP: contenido visible; cifras finales aseguradas
    $$("[data-count]").forEach(function (el) {
      var target = parseFloat(el.getAttribute("data-count"));
      var dec = parseInt(el.getAttribute("data-decimals") || "0", 10);
      if (!isNaN(target)) el.textContent = fmt(target, dec);
    });
  }

  /* ---------------- Navegación por teclado entre escenas ---------------- */
  var REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function currentSceneIndex() {
    var best = 0, bestDist = Infinity;
    sections.forEach(function (s, i) {
      var d = Math.abs(s.getBoundingClientRect().top - 64);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
  }
  function goToScene(i) {
    i = Math.max(0, Math.min(sections.length - 1, i));
    sections[i].scrollIntoView({ behavior: REDUCE ? "auto" : "smooth", block: "start" });
  }
  document.addEventListener("keydown", function (e) {
    if ($("#hub").classList.contains("is-open")) return;
    var t = e.target.tagName;
    if (/INPUT|TEXTAREA|SELECT|BUTTON|A/.test(t) || e.target.isContentEditable) return;
    if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
      e.preventDefault(); goToScene(currentSceneIndex() + 1);
    } else if (e.key === "ArrowUp" || e.key === "PageUp") {
      e.preventDefault(); goToScene(currentSceneIndex() - 1);
    }
  });

  /* ---------------- Clímax: toggle anual / mensual ---------------- */
  var note = $("#climaxNote");
  $$(".toggle__btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      $$(".toggle__btn").forEach(function (b) { b.classList.remove("is-active"); b.setAttribute("aria-pressed", "false"); });
      btn.classList.add("is-active"); btn.setAttribute("aria-pressed", "true");
      if (note) note.hidden = btn.getAttribute("data-view") !== "mensual";
    });
  });

  /* ---------------- Desglose interactivo ---------------- */
  var BD = {
    rrhh:  { a: "M$287.539", t: "Recursos humanos", s: "67,5% del costo anual (69,9% de la operación)", p: "13 cargos financiados íntegramente con recursos municipales para operar el museo y la biblioteca: jefaturas, curador, recepción, guías, bibliotecario, especialista infantil, biblioredes y coordinaciones de educación, difusión y administración. Cubren un déficit actual (hoy el museo funciona con 2–3 personas y la biblioteca con 6) y sostienen una apertura de 67,5 horas semanales. Es el costo habilitante del proyecto." },
    vig:   { a: "M$52.252",  t: "Servicios de vigilancia", s: "12,3% del costo anual", p: "Segundo mayor gasto operativo. Guardias externalizados con custodia nocturna y apoyo diurno en accesos, CCTV 24/7 con cámaras infrarrojas, sensores y enlace directo a Carabineros de Castro. Resguarda colecciones arqueológicas e históricas de valor incalculable y la Sala Memoria Regional, en 4 niveles con capacidad para 473 personas (~$24.224 por m² cerrado al año)." },
    aseo:  { a: "M$18.717",  t: "Servicios de aseo", s: "4,4% del costo anual", p: "Limpieza externalizada indexada a 2.157,1 m² cerrados de alta circulación más baños públicos, con recintos de apoyo propios (pañol de aseo y sala de basura). Condición de salubridad para una carga de hasta 473 personas durante toda la operación." },
    mant:  { a: "M$14.754",  t: "Mantención", s: "3,5% del costo anual", p: "Edificaciones (M$7.998, el 54%): sellado, impermeabilización y limpieza de canaletas para el hormigón armado en clima salino y lluvioso. Más mobiliario especializado y museográfico (estanterías \"full space\", vitrinas, plintos) y soporte de máquinas y equipos informáticos. Preserva el valor del inmueble en el horizonte de evaluación." },
    calef: { a: "M$10.615",  t: "Combustible para calefacción", s: "2,5% del costo anual", p: "El clima frío, húmedo y lluvioso de Chiloé exige calefacción gran parte del año, no solo por confort sino para mantener condiciones higrométricas estables que conservan papel, madera y textiles. Servido por el recinto de calefacción del área técnica de instalaciones (nivel −1)." },
    elec:  { a: "M$9.598",   t: "Electricidad", s: "2,3% del costo anual", p: "Iluminación, climatización (UMA y aire acondicionado), Data Center y equipamiento tecnológico en operación de lunes a sábado. Junto al combustible, el gasto energético equivale a ~$9.371 por m² cerrado al año, moderado para un edificio con control ambiental de conservación." },
    otros: { a: "M$32.509",  t: "Otros costos de operación", s: "7,6% del costo anual", p: "Agrupa cuatro bloques: difusión y eventos (M$13.831: publicidad, producción e impresión, para una cartelera de 199 actividades); menaje y materiales de oficina (M$10.361); tecnología y conectividad (M$3.544: internet, telefonía e insumos, sobre software de biblioteca ALEPH, pasarelas de pago e infopaneles); y servicios básicos y logística (M$2.373: agua, correo y fletes). Insumos necesarios para la operación cotidiana." }
  };
  var bdA = $("#bdAmount"), bdT = $("#bdTitle"), bdP = $("#bdText"), bdS = $("#bdShare");
  $$(".seg").forEach(function (seg) {
    seg.addEventListener("click", function () {
      $$(".seg").forEach(function (s) { s.setAttribute("aria-pressed", "false"); });
      seg.setAttribute("aria-pressed", "true");
      var d = BD[seg.getAttribute("data-key")];
      if (!d) return;
      bdA.textContent = d.a; bdT.textContent = d.t; bdP.textContent = d.p; bdS.textContent = d.s;
    });
  });

  /* ================================================================
     HUB DE RESPALDO
     ================================================================ */
  var hub = $("#hub"), hubScrim = $("#hubScrim"), hubBody = $("#hubBody");
  var hubTabs = $$(".hub__tab"), hubPanels = $$(".hub__panel");
  var hubSearch = $("#hubSearch"), hubEmpty = $("#hubEmpty");
  var lastFocused = null;

  function setCategory(cat) {
    hubTabs.forEach(function (t) { t.classList.toggle("is-active", t.getAttribute("data-cat") === cat); });
    hubPanels.forEach(function (p) { p.classList.toggle("is-active", p.getAttribute("data-cat") === cat); });
    hubBody.scrollTop = 0;
  }
  function openHub(cat) {
    lastFocused = document.activeElement;
    if (cat) setCategory(cat);
    hubScrim.hidden = false; hub.hidden = false;
    requestAnimationFrame(function () { hubScrim.classList.add("is-open"); hub.classList.add("is-open"); });
    document.body.style.overflow = "hidden";
    hub.focus();
  }
  function closeHub() {
    hub.classList.remove("is-open"); hubScrim.classList.remove("is-open");
    document.body.style.overflow = "";
    setTimeout(function () { hub.hidden = true; hubScrim.hidden = true; }, 520);
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  $$("[data-hub-open]").forEach(function (btn) {
    btn.addEventListener("click", function () { openHub(btn.getAttribute("data-hub-open")); });
  });
  hubTabs.forEach(function (t) {
    t.addEventListener("click", function () {
      if (hubSearch.value) { hubSearch.value = ""; runSearch(); }
      setCategory(t.getAttribute("data-cat"));
    });
  });
  $("#hubClose").addEventListener("click", closeHub);
  hubScrim.addEventListener("click", closeHub);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && hub.classList.contains("is-open")) closeHub();
  });

  /* Focus trap */
  hub.addEventListener("keydown", function (e) {
    if (e.key !== "Tab") return;
    var f = $$('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])', hub)
      .filter(function (el) { return el.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* Buscador */
  function runSearch() {
    var q = hubSearch.value.trim().toLowerCase();
    var units = $$(".hub__panel tr, .hub__panel li, .hub__panel p:not(.hub__src)", hubBody);
    if (!q) {
      hubBody.classList.remove("is-searching");
      units.forEach(function (u) { u.hidden = false; });
      hubEmpty.hidden = true;
      hubPanels.forEach(function (p) { p.classList.remove("is-active"); });
      var active = hubTabs.filter(function (t) { return t.classList.contains("is-active"); })[0];
      setCategory(active ? active.getAttribute("data-cat") : "ficha");
      return;
    }
    hubBody.classList.add("is-searching");
    var matches = 0;
    units.forEach(function (u) {
      var hit = u.textContent.toLowerCase().indexOf(q) !== -1;
      u.hidden = !hit; if (hit) matches++;
    });
    hubEmpty.hidden = matches > 0;
  }
  hubSearch.addEventListener("input", runSearch);

})();
