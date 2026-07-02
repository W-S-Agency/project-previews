/* andagon BFSG Self-Check ("2-Minuten-Check") — funktionaler, standalone Widget
   Muster: Panacea Kostenrechner (preview/panacea_preview_rechner.js)
   Logik-Quelle (SoT): docs/barrierefreiheit/programmierer-anweisung-self-check.md §2  (✅ CLIENT: D-CLNT-010 / D-CLNT-012)
   Copy-Quelle (DE, verbatim): preview/barrierefreiheit/index.html v3.4  (Kundenfeedback eingearbeitet)
   Standalone, keine Dependencies. Init: AndagonSelfCheck.init("#container-id", { ctaHref, onComplete })

   ⚖️ LEGAL-VORBEHALT (D-PROJ-010): Schwellen (F3), 🟢-Logik und die finalen Ergebnistexte
      sind vor Live von andagon/Legal freizugeben. Bis dahin gilt diese Fassung als
      "vorbehaltlich Freigabe". Alle tunbaren Werte stehen ausschließlich in CONFIG. */
(function (global) {

  const CONFIG = {
    version: "1.0",
    lastUpdated: "2026-07-02",

    // ── Die 5 Fragen (Texte DE = verbatim aus index.html v3.4; value = stabiler Maschinen-Code) ──
    questions: [
      {
        id: "q1",
        legend: "1. In welcher Branche arbeiten Sie?",
        options: [
          { value: "ecommerce", label: "Online-Shop / E-Commerce" },
          { value: "bank",      label: "Bank, Finanzen oder Versicherung" },
          { value: "telko",     label: "Telekommunikation" },
          { value: "saas",      label: "Software/Online-Dienst (SaaS)" },
          { value: "b2b",       label: "Etwas anderes / vor allem Geschäftskunden (B2B)" }
        ]
      },
      {
        id: "q2",
        legend: "2. Richtet sich Ihr Angebot (auch) an normale Endkunden, also Verbraucher?",
        options: [
          { value: "ja",       label: "Ja" },
          { value: "nein",     label: "Nein, nur Geschäftskunden" },
          { value: "unsicher", label: "Bin nicht sicher" }
        ]
      },
      {
        id: "q3",
        legend: "3. Wie groß ist Ihr Unternehmen?",
        options: [
          { value: "klein", label: "Unter 10 Mitarbeitende und unter 2 Mio. € Umsatz im Jahr" },
          { value: "gross", label: "Größer" }
        ]
      },
      {
        id: "q4",
        legend: "4. Wurde Ihre Website schon einmal auf Barrierefreiheit geprüft?",
        options: [
          { value: "ja",    label: "Ja, mit einem schriftlichen Nachweis" },
          { value: "nein",  label: "Nein" },
          { value: "weiss", label: "Weiß ich nicht" }
        ]
      },
      {
        id: "q5",
        legend: "5. Kann man Ihre Website allein mit der Tastatur bedienen, und liest ein Screenreader sie vor?",
        legendHint: "(Ein Screenreader ist ein Programm, das blinden Menschen die Seite vorliest.)",
        options: [
          { value: "ja",        label: "Ja" },
          { value: "teilweise", label: "Teilweise" },
          { value: "nein",      label: "Nein" },
          { value: "weiss",     label: "Weiß ich nicht" }
        ]
      }
    ],

    // ── Ergebnistexte (DE = verbatim aus index.html v3.4; vor Live Legal-Freigabe) ──
    results: {
      red: {
        cls: "asc-r-red", badgeCls: "asc-b-red",
        badge: "🔴 Sie sollten handeln",
        title: "Sie sollten handeln",
        text: "Nach Ihren Antworten gilt das Gesetz wahrscheinlich für Sie – und ein Nachweis fehlt noch. Wird das nicht behoben, kann die Marktaufsicht Nachbesserungen verlangen – und bei ausbleibender Nachbesserung Nutzungsverbote oder Bußgelder (bis 100.000 €) verhängen. Unser Tipp: Lassen Sie Ihre Website prüfen. In der kostenlosen Erstberatung sagen wir Ihnen, was für Sie konkret nötig ist."
      },
      amber: {
        cls: "asc-r-amber", badgeCls: "asc-b-amber",
        badge: "🟡 Teilweise abgesichert",
        title: "Teilweise abgesichert",
        text: "Sie sind wahrscheinlich betroffen und haben schon etwas getan – gut. Oft bleiben aber Lücken, die im Ernstfall zählen. Eine gezielte Prüfung zeigt Ihnen genau, wo Sie stehen. Reden wir unverbindlich darüber – die Erstberatung ist kostenlos."
      },
      green: {
        cls: "asc-r-green", badgeCls: "asc-b-green",
        badge: "🟢 Wenig dringend",
        title: "Wenig dringend",
        text: "Nach Ihren Antworten haben Sie es vermutlich nicht eilig. Ganz sicher wissen Sie es aber erst nach einer Prüfung – und die Regeln ändern sich. In der kostenlosen Erstberatung zeigen wir Ihnen, wie Sie auf der sicheren Seite bleiben."
      }
    },

    cta: "Kostenlose Erstberatung anfragen",
    disclaimer: "Das ist eine erste Einschätzung und ersetzt keine rechtliche Prüfung.",
    submitLabel: "Mein Ergebnis anzeigen",
    errorAllRequired: "Bitte beantworten Sie alle 5 Fragen.",

    // ── GA4-Ereignisnamen (Tracking nach Zugängen, sauberes Consent-Setup — NICHT invertierten
    //     Consent-Mode der Hauptseite übernehmen, D-AUDIT-001) ──
    events: { start: "assessment_start", complete: "assessment_complete", lead: "lead_submit" }
  };

  /* ── REINE LOGIK — deterministisch, "erstes zutreffendes Regel gewinnt" ──
     Exportiert (AndagonSelfCheck.evaluate) für Tests. Spiegelt §2.2 der Programmierer-Anweisung.
     Rückgabe: "red" | "amber" | "green"

     ⚠️ ABWEICHUNG zur alten index.html-Fassung (bewusst, siehe TZ_Self-Check_v1.md §Logik-Entscheidung):
        reines B2B ohne Nachweis → hier DEFAULT 🟡 (nicht 🔴). Reines B2B ist selten BFSG-betroffen,
        deshalb ist "gelb/klären" belastbarer als ein pauschales "Sie sollten handeln". Legal-Confirm. */
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

    // Regel 1 → 🔴
    if (verbraucherbezug && luecke) return "red";
    // Regel 2 → 🟡
    if (verbraucherbezug && vollAbgesichert) return "amber";
    // Regel 3 → 🟢
    if (reineDienstleistungOhneVerbraucher && kleinstunternehmen && a.q4 === "ja") return "green";
    // Regel 4 → 🟡 [DEFAULT, nie 🟢]
    return "amber";
  }

  function track(name, params) {
    if (typeof global.gtag === "function") global.gtag("event", name, params || {});
    if (Array.isArray(global.dataLayer)) global.dataLayer.push(Object.assign({ event: name }, params || {}));
  }

  function render(root, opts) {
    const ctaHref = opts.ctaHref || "#kontakt";
    const q = CONFIG.questions;

    root.innerHTML =
      '<form class="asc-form" novalidate>' +
        q.map(function (item) {
          return (
            '<fieldset class="asc-fieldset"><legend class="asc-legend">' + item.legend +
            (item.legendHint ? ' <span class="asc-hint">' + item.legendHint + '</span>' : '') +
            '</legend><div class="asc-opts" role="radiogroup" aria-label="' + item.legend.replace(/"/g, "&quot;") + '">' +
            item.options.map(function (o) {
              return '<label class="asc-opt"><input type="radio" name="' + item.id + '" value="' + o.value + '">' + o.label + '</label>';
            }).join("") +
            '</div></fieldset>'
          );
        }).join("") +
        '<p class="asc-err" role="alert">' + CONFIG.errorAllRequired + '</p>' +
        '<button class="asc-btn asc-btn-lg" type="submit">' + CONFIG.submitLabel + '</button>' +
      '</form>' +
      '<div class="asc-result" role="region" aria-live="polite" tabindex="-1"></div>';

    const form = root.querySelector(".asc-form");
    const err = root.querySelector(".asc-err");
    const res = root.querySelector(".asc-result");
    let startFired = false;

    // assessment_start beim ersten Interaktions-Klick
    form.addEventListener("change", function () {
      if (!startFired) { startFired = true; track(CONFIG.events.start); }
    });

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      const a = {};
      CONFIG.questions.forEach(function (item) {
        const sel = form.querySelector('input[name="' + item.id + '"]:checked');
        a[item.id] = sel ? sel.value : null;
      });
      const complete = CONFIG.questions.every(function (item) { return a[item.id]; });
      if (!complete) { err.style.display = "block"; return; }
      err.style.display = "none";

      const level = evaluate(a);       // "red" | "amber" | "green"
      const r = CONFIG.results[level];
      track(CONFIG.events.complete, { result: level });

      res.className = "asc-result asc-show " + r.cls;
      res.innerHTML =
        '<span class="asc-badge ' + r.badgeCls + '">' + r.badge + '</span>' +
        '<h3 class="asc-result-title">' + r.title + '</h3>' +
        '<p>' + r.text + '</p>' +
        '<a class="asc-btn asc-btn-lg" href="' + ctaHref + '">' + CONFIG.cta + '</a>' +
        '<p class="asc-disc">' + CONFIG.disclaimer + '</p>';
      res.focus();

      // Ergebnis + Antworten nach außen geben → Seite hängt sie an den Lead-Payload (F1–F5 + Ampel)
      if (typeof opts.onComplete === "function") opts.onComplete({ result: level, answers: a });
    });
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
