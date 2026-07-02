/* andagon BFSG Self-Check ("2-Minuten-Check") — funktionaler, standalone Widget (STEPPER)
   Muster: Panacea Kostenrechner (preview/panacea_preview_rechner.js)
   Interaktionsmodell: Schritt-für-Schritt (1 Frage pro Schritt), gemäß Figma „Section / 2-Minuten-Check" (5 Frames = Frage 1/5 … 5/5)
   Logik-Quelle (SoT): docs/barrierefreiheit/programmierer-anweisung-self-check.md §2  (✅ CLIENT: D-CLNT-010 / D-CLNT-012)
   Copy-Quelle (DE): NUR Texte aus preview/barrierefreiheit/index.html v3.4 — NIEMALS die dortige (veraltete) Logik übernehmen.
   Standalone, keine Dependencies. Init: AndagonSelfCheck.init("#container-id", { ctaHref, onComplete })

   ⚖️ LEGAL-VORBEHALT (D-PROJ-010): F3-Schwellen, 🟢-Logik und finale Ergebnistexte vor Live von andagon/Legal freigeben.
      Alle tunbaren Werte stehen ausschließlich in CONFIG. */
(function (global) {

  const CONFIG = {
    version: "1.1",
    lastUpdated: "2026-07-02",

    // Fixer Kopf (über dem Schritt-Container) — entspricht Figma-Section-Header
    eyebrow: "2-Minuten-Check",
    heading: "Sind Sie betroffen? Finden Sie es heraus.",
    intro: "Beantworten Sie 5 kurze Fragen. Sie sehen sofort, ob das Gesetz für Sie gilt – und wie dringend Sie handeln sollten.",

    nav: { back: "← Zurück", next: "Weiter →", result: "Mein Ergebnis anzeigen" },
    progressTpl: "Frage {n}/{total}",
    errorSelect: "Bitte wählen Sie eine Antwort, um fortzufahren.",

    // ── Die 5 Fragen (Texte DE = verbatim aus index.html v3.4; value = stabiler Maschinen-Code) ──
    questions: [
      {
        id: "q1", legend: "In welcher Branche arbeiten Sie?",
        options: [
          { value: "ecommerce", label: "Online-Shop / E-Commerce" },
          { value: "bank",      label: "Bank, Finanzen oder Versicherung" },
          { value: "telko",     label: "Telekommunikation" },
          { value: "saas",      label: "Software/Online-Dienst (SaaS)" },
          { value: "b2b",       label: "Etwas anderes / vor allem Geschäftskunden (B2B)" }
        ]
      },
      {
        id: "q2", legend: "Richtet sich Ihr Angebot (auch) an normale Endkunden, also Verbraucher?",
        options: [
          { value: "ja",       label: "Ja" },
          { value: "nein",     label: "Nein, nur Geschäftskunden" },
          { value: "unsicher", label: "Bin nicht sicher" }
        ]
      },
      {
        id: "q3", legend: "Wie groß ist Ihr Unternehmen?",
        options: [
          { value: "klein", label: "Unter 10 Mitarbeitende und unter 2 Mio. € Umsatz im Jahr" },
          { value: "gross", label: "Größer" }
        ]
      },
      {
        id: "q4", legend: "Wurde Ihre Website schon einmal auf Barrierefreiheit geprüft?",
        options: [
          { value: "ja",    label: "Ja, mit einem schriftlichen Nachweis" },
          { value: "nein",  label: "Nein" },
          { value: "weiss", label: "Weiß ich nicht" }
        ]
      },
      {
        id: "q5", legend: "Kann man Ihre Website allein mit der Tastatur bedienen, und liest ein Screenreader sie vor?",
        legendHint: "(Ein Screenreader ist ein Programm, das blinden Menschen die Seite vorliest.)",
        options: [
          { value: "ja",        label: "Ja" },
          { value: "teilweise", label: "Teilweise" },
          { value: "nein",      label: "Nein" },
          { value: "weiss",     label: "Weiß ich nicht" }
        ]
      }
    ],

    // ── Ergebnis (DE = verbatim aus index.html v3.4; Ampel = farbiges Wort „Handlungsbedarf", kein Emoji — Figma-Abgleich) ──
    resultLabel: "Ergebnis",
    bedarfLabel: "Handlungsbedarf:",
    results: {
      red: {
        sevCls: "asc-sev-red", handlungsbedarf: "hoch", title: "Sie sollten handeln",
        text: "Nach Ihren Antworten gilt das Gesetz wahrscheinlich für Sie – und ein Nachweis fehlt noch. Wird das nicht behoben, kann die Marktaufsicht Nachbesserungen verlangen – und bei ausbleibender Nachbesserung Nutzungsverbote oder Bußgelder (bis 100.000 €) verhängen. Unser Tipp: Lassen Sie Ihre Website prüfen. In der kostenlosen Erstberatung sagen wir Ihnen, was für Sie konkret nötig ist."
      },
      amber: {
        sevCls: "asc-sev-amber", handlungsbedarf: "mittel", title: "Teilweise abgesichert",
        text: "Sie sind wahrscheinlich betroffen und haben schon etwas getan – gut. Oft bleiben aber Lücken, die im Ernstfall zählen. Eine gezielte Prüfung zeigt Ihnen genau, wo Sie stehen. Reden wir unverbindlich darüber – die Erstberatung ist kostenlos."
      },
      green: {
        sevCls: "asc-sev-green", handlungsbedarf: "gering", title: "Wenig dringend",
        text: "Nach Ihren Antworten haben Sie es vermutlich nicht eilig. Ganz sicher wissen Sie es aber erst nach einer Prüfung – und die Regeln ändern sich. In der kostenlosen Erstberatung zeigen wir Ihnen, wie Sie auf der sicheren Seite bleiben."
      }
    },

    cta: "Kostenlose Erstberatung anfragen",
    restart: "← Zum Start zurück",
    disclaimer: "Das ist eine erste Einschätzung und ersetzt keine rechtliche Prüfung.",

    // ── GA4-Ereignisnamen. ⚠️ Consent: NUR feuern, wenn Analytics-Consent vorliegt (Consent Mode) —
    //    NICHT den invertierten Consent-Mode der Hauptseite übernehmen (D-AUDIT-001). ──
    events: { start: "assessment_start", complete: "assessment_complete", lead: "lead_submit" }
  };

  /* ── REINE LOGIK — deterministisch, "erstes zutreffendes Regel gewinnt". Exportiert für Tests.
     Rückgabe: "red" | "amber" | "green". Spiegelt §2.2 der Programmierer-Anweisung.
     ⚠️ ABWEICHUNG zur alten index.html-JS: reines B2B ohne Nachweis → hier DEFAULT 🟡 (nicht 🔴). Legal-Confirm (D-PROJ-011). */
  function evaluate(a) {
    const verbraucherbezug =
      ["ecommerce", "bank", "telko", "saas"].indexOf(a.q1) !== -1 ||
      ["ja", "unsicher"].indexOf(a.q2) !== -1;
    const luecke =
      ["nein", "weiss"].indexOf(a.q4) !== -1 ||
      ["teilweise", "nein", "weiss"].indexOf(a.q5) !== -1;
    const vollAbgesichert = a.q4 === "ja" && a.q5 === "ja";
    const reineDienstleistungOhneVerbraucher = a.q1 === "b2b" && a.q2 === "nein";
    const kleinstunternehmen = a.q3 === "klein";

    if (verbraucherbezug && luecke) return "red";                                    // Regel 1
    if (verbraucherbezug && vollAbgesichert) return "amber";                         // Regel 2
    if (reineDienstleistungOhneVerbraucher && kleinstunternehmen && a.q4 === "ja") return "green"; // Regel 3
    return "amber";                                                                  // Regel 4 [DEFAULT]
  }

  function track(name, params) {
    if (typeof global.gtag === "function") global.gtag("event", name, params || {});
    if (Array.isArray(global.dataLayer)) global.dataLayer.push(Object.assign({ event: name }, params || {}));
  }

  function esc(s) { return String(s).replace(/"/g, "&quot;"); }

  function render(root, opts) {
    const ctaHref = opts.ctaHref || "#kontakt";
    const Q = CONFIG.questions;
    const total = Q.length;

    root.innerHTML =
      '<div class="asc-widget">' +
        '<div class="asc-header">' +
          '<span class="asc-eyebrow">' + CONFIG.eyebrow + '</span>' +
          '<h2 class="asc-heading">' + CONFIG.heading + '</h2>' +
          '<p class="asc-intro">' + CONFIG.intro + '</p>' +
        '</div>' +
        '<div class="asc-stage">' +
          '<div class="asc-step" role="group" aria-live="polite"></div>' +
          '<div class="asc-result" role="region" aria-live="polite" tabindex="-1"></div>' +
          '<div class="asc-restart-wrap" hidden></div>' +
        '</div>' +
      '</div>';

    const card = root.querySelector(".asc-step");
    const res = root.querySelector(".asc-result");
    const restartWrap = root.querySelector(".asc-restart-wrap");
    const state = { step: 0, answers: {}, startFired: false, completeFired: false };

    function fireStart() { if (!state.startFired) { state.startFired = true; track(CONFIG.events.start); } }

    function renderStep() {
      res.className = "asc-result";              // Ergebnis ausblenden, falls man zurückgeht
      res.innerHTML = "";
      restartWrap.hidden = true; restartWrap.innerHTML = "";
      const q = Q[state.step];
      const isLast = state.step === total - 1;
      const progress = CONFIG.progressTpl.replace("{n}", state.step + 1).replace("{total}", total);

      card.innerHTML =
        '<p class="asc-progress">' + progress + '</p>' +
        '<fieldset class="asc-fieldset"><legend class="asc-legend">' + q.legend +
          (q.legendHint ? ' <span class="asc-hint">' + q.legendHint + '</span>' : '') +
        '</legend>' +
        '<div class="asc-opts" role="radiogroup" aria-label="' + esc(q.legend) + '">' +
          q.options.map(function (o) {
            const checked = state.answers[q.id] === o.value ? " checked" : "";
            return '<label class="asc-opt"><input type="radio" name="' + q.id + '" value="' + o.value + '"' + checked + '>' + o.label + '</label>';
          }).join("") +
        '</div></fieldset>' +
        '<p class="asc-err" role="alert">' + CONFIG.errorSelect + '</p>' +
        '<div class="asc-nav">' +
          (state.step > 0 ? '<button type="button" class="asc-btn asc-btn-back">' + CONFIG.nav.back + '</button>' : '<span></span>') +
          '<button type="button" class="asc-btn asc-btn-next">' + (isLast ? CONFIG.nav.result : CONFIG.nav.next) + '</button>' +
        '</div>';

      const err = card.querySelector(".asc-err");
      card.querySelectorAll('input[name="' + q.id + '"]').forEach(function (inp) {
        inp.addEventListener("change", function () {
          state.answers[q.id] = inp.value;
          err.style.display = "none";
          fireStart();
        });
      });
      const back = card.querySelector(".asc-btn-back");
      if (back) back.addEventListener("click", function () { state.step--; renderStep(); });
      card.querySelector(".asc-btn-next").addEventListener("click", function () {
        if (!state.answers[q.id]) { err.style.display = "block"; return; }
        if (isLast) { showResult(); } else { state.step++; renderStep(); }
      });

      // Fokus auf die Schritt-Überschrift (Progress) → Screenreader kündigt neuen Schritt an
      const prog = card.querySelector(".asc-progress");
      prog.setAttribute("tabindex", "-1");
      prog.focus();
    }

    function showResult() {
      const level = evaluate(state.answers);     // "red" | "amber" | "green"
      const r = CONFIG.results[level];
      if (!state.completeFired) { state.completeFired = true; track(CONFIG.events.complete, { result: level }); }

      card.innerHTML = "";                        // Schritt-Karte ausblenden
      res.className = "asc-result asc-show";       // weiße Ergebnis-Karte (Ampel via farbiges „Handlungsbedarf"-Wort)
      res.innerHTML =
        '<p class="asc-result-label">' + CONFIG.resultLabel + '</p>' +
        '<h3 class="asc-result-title">' + r.title + '</h3>' +
        '<p class="asc-bedarf">' + CONFIG.bedarfLabel + ' <strong class="' + r.sevCls + '">' + r.handlungsbedarf + '</strong></p>' +
        '<p class="asc-result-text">' + r.text + '</p>' +
        '<a class="asc-btn asc-btn-lg" href="' + ctaHref + '">' + CONFIG.cta + ' →</a>' +
        '<p class="asc-disc">' + CONFIG.disclaimer + '</p>';
      res.focus();

      // „← Zum Start zurück" unter der Karte (wie Figma)
      restartWrap.hidden = false;
      restartWrap.innerHTML = '<button type="button" class="asc-btn asc-btn-back asc-restart">' + CONFIG.restart + '</button>';
      restartWrap.querySelector(".asc-restart").addEventListener("click", function () {
        state.step = 0; state.answers = {}; state.completeFired = false; renderStep();
      });

      // Ergebnis + Antworten nach außen → Seite hängt sie an den Lead-Payload (F1–F5 + Ampel)
      if (typeof opts.onComplete === "function") opts.onComplete({ result: level, answers: Object.assign({}, state.answers) });
    }

    renderStep();
  }

  global.AndagonSelfCheck = {
    init: function (selector, opts) {
      const root = typeof selector === "string" ? document.querySelector(selector) : selector;
      if (!root) return;
      render(root, opts || {});
    },
    CONFIG: CONFIG,
    evaluate: evaluate   // exportiert für Tests (siehe TZ_Self-Check_v1.md §Test-Cases)
  };
})(typeof window !== "undefined" ? window : this);
