/* =================================================================
   Museo + Biblioteca de Castro · Presentación al Concejo
   Vanilla JS · sin dependencias · offline
   ================================================================= */
(function () {
  "use strict";

  var REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------------- NAV: shrink + progreso ---------------- */
  var nav = $("#nav");
  var progress = $("#navProgress");
  function onScrollUI() {
    var y = window.pageYOffset;
    nav.classList.toggle("nav--shrink", y > 40);
    var h = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
  }

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

  /* ---------------- Reveal + stair-draw ---------------- */
  // stagger por orden dentro de cada escena
  sections.forEach(function (scene) {
    $$("[data-reveal]", scene).forEach(function (el, i) {
      el.style.setProperty("--d", Math.min(i * 80, 480) + "ms");
    });
  });
  $$("[data-stair], .process__line").forEach(function (svg) {
    var p = svg.querySelector("path");
    if (p) p.setAttribute("pathLength", "1");
  });

  if (REDUCE) {
    $$("[data-reveal]").forEach(function (el) { el.classList.add("is-visible"); });
    $$("[data-stair], .process__line").forEach(function (el) { el.classList.add("is-drawn"); });
  } else {
    var revealObs = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); obs.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    $$("[data-reveal]").forEach(function (el) { revealObs.observe(el); });

    var stairObs = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-drawn"); obs.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    $$("[data-stair], .process__line").forEach(function (el) { stairObs.observe(el); });
  }

  /* ---------------- Count-up ---------------- */
  function fmt(n, dec) {
    return n.toLocaleString("es-CL", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }
  function countUp(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var dec = parseInt(el.getAttribute("data-decimals") || "0", 10);
    var grave = el.hasAttribute("data-grave");
    if (REDUCE || isNaN(target)) { el.textContent = fmt(target, dec); return; }
    var dur = grave ? 1800 : 1100, start = null;
    function step(ts) {
      if (start === null) start = ts;
      var t = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = fmt(target * eased, dec);
      if (t < 1) requestAnimationFrame(step);
      else { el.textContent = fmt(target, dec); if (grave) { el.classList.add("is-settled"); } }
    }
    requestAnimationFrame(step);
  }
  var countObs = new IntersectionObserver(function (entries, obs) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { countUp(e.target); obs.unobserve(e.target); }
    });
  }, { threshold: 0.6 });
  $$("[data-count]").forEach(function (el) { countObs.observe(el); });

  /* ---------------- Parallax ---------------- */
  var parallaxEls = $$("[data-parallax]");
  function applyParallax() {
    if (REDUCE) return;
    var vh = window.innerHeight;
    parallaxEls.forEach(function (el) {
      var f = parseFloat(el.getAttribute("data-parallax")) || 0;
      var r = el.getBoundingClientRect();
      var offset = (r.top + r.height / 2) - vh / 2;
      var ty = Math.max(-48, Math.min(48, offset * -f));
      el.style.transform = "translateY(" + ty.toFixed(1) + "px)";
    });
  }

  /* ---------------- rAF scroll loop ---------------- */
  var ticking = false;
  function onScroll() {
    if (!ticking) { requestAnimationFrame(function () { onScrollUI(); applyParallax(); ticking = false; }); ticking = true; }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () { onScrollUI(); applyParallax(); });
  onScrollUI(); applyParallax();

  /* ---------------- Navegación por teclado entre escenas ---------------- */
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
    rrhh:  { a: "M$287.539", t: "Recursos humanos", s: "67,5% del costo anual", p: "13 cargos para operar el museo y la biblioteca: dirección, atención de público, bibliotecarios, curador, especialista infantil, biblioredes y coordinaciones transversales. Financiados íntegramente con recursos municipales." },
    vig:   { a: "M$52.252",  t: "Servicios de vigilancia", s: "12,3% del costo anual", p: "El edificio albergará usuarios, colecciones, libros, equipamiento y espacios públicos. El modelo contempla seguridad continua, CCTV 24/7 y protocolos de emergencia para usuarios y patrimonio." },
    aseo:  { a: "M$18.717",  t: "Servicios de aseo", s: "4,4% del costo anual", p: "Limpieza externalizada de 2.835 m² de uso público intensivo, condición básica para mantener el edificio abierto y en condiciones de atención." },
    mant:  { a: "M$14.754",  t: "Mantención", s: "3,5% del costo anual", p: "Mantención de edificaciones, mobiliario, máquinas y equipos informáticos, planificada para el clima de Chiloé (humedad, lluvia, salinidad)." },
    calef: { a: "M$10.615",  t: "Combustible para calefacción", s: "2,5% del costo anual", p: "El clima frío y húmedo de Chiloé exige calefacción durante gran parte del año, tanto para el confort de usuarios como para el control ambiental de las colecciones." },
    elec:  { a: "M$9.598",   t: "Electricidad", s: "2,3% del costo anual", p: "Iluminación, climatización, data center y equipamiento tecnológico del edificio en operación continua." },
    otros: { a: "M$32.509",  t: "Otros costos de operación", s: "7,6% del costo anual", p: "Agua, internet, telefonía, publicidad, impresión, producción de eventos, menaje, materiales y demás insumos necesarios para la operación cotidiana." }
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
    setTimeout(function () { hub.hidden = true; hubScrim.hidden = true; }, 350);
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
