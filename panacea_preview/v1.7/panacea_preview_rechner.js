/* Panacea Pflegekostenrechner — funktionaler Preview-Widget
   Basiert auf docs/TZ_Kostenrechner_v1.md §4
   Standalone, keine Dependencies. Initialisierung: PanaceaRechner.init("#container-id") */
(function(global){
  const CONFIG = {
    minutePrice: 0.75,
    minVisitMinutes: 10,
    maxVisitMinutes: 120,
    stepMinutes: 5,
    maxVisitsPerDay: 3,
    sachleistungen: { 2: 796, 3: 1497, 4: 1859, 5: 2299 },
    recommendations: {
      2: { visits: 1, minutesPerVisit: 30 },
      3: { visits: 2, minutesPerVisit: 30 },
      4: { visits: 2, minutesPerVisit: 45 },
      5: { visits: 3, minutesPerVisit: 40 }
    },
    defaults: [40, 20, 10]
  };

  const EUR = n => n.toLocaleString("de-DE", { maximumFractionDigits: 0 }) + " €";

  function calc(state){
    const totalMin = state.visits.reduce((s,v) => s + v, 0);
    const gesamt = totalMin * CONFIG.minutePrice * 30;
    const kasse = state.pg ? Math.min(gesamt, CONFIG.sachleistungen[state.pg]) : 0;
    const zuzahlung = Math.max(0, gesamt - kasse);
    return { totalMin, gesamt, kasse, zuzahlung };
  }

  function render(root, opts){
    const compact = !!opts.compact;
    root.innerHTML = `
      <div class="rechner-widget ${compact ? 'rechner-compact' : ''}">
        <div class="rechner-step">
          <div class="rechner-step-header">
            <span class="rechner-step-num">1</span>
            <span class="rechner-step-title">Pflegegrad auswählen</span>
          </div>
          <div class="rechner-pg" role="radiogroup" aria-label="Pflegegrad">
            ${[2,3,4,5].map(g => `<button type="button" class="rechner-pg-btn" data-pg="${g}" role="radio" aria-checked="false">${g}</button>`).join("")}
          </div>
        </div>

        <div class="rechner-empfehlung" hidden>
          <strong>✓ Empfehlung:</strong> <span class="rechner-empfehlung-text"></span>
        </div>

        <div class="rechner-step rechner-step-2" data-active="false">
          <div class="rechner-step-header">
            <span class="rechner-step-num">2</span>
            <span class="rechner-step-title">Anzahl und Dauer der täglichen Besuche</span>
          </div>
          <div class="rechner-visits"></div>
          <button type="button" class="rechner-add" hidden>+ Weiteren Besuch hinzufügen</button>
          <div class="rechner-hint">Schrittweite 5 min · max. 3 Besuche/Tag</div>
        </div>

        <div class="rechner-result" hidden>
          <div class="rechner-result-label">Zusammenfassung</div>
          <div class="rechner-row"><span>Geschätzte Gesamtkosten / Monat</span><strong class="r-gesamt">0 €</strong></div>
          <div class="rechner-row"><span>Davon Pflegekasse</span><strong class="r-kasse">0 €</strong></div>
          <div class="rechner-row rechner-row-final"><span><strong>Ihre Zuzahlung</strong></span><strong class="r-zuzahlung">0 €/Monat</strong></div>
          <div class="rechner-result-msg" hidden></div>
          <div class="rechner-disclaimer">Alle Angaben unverbindlich · individuell im Beratungsgespräch</div>
          <button type="button" class="rechner-cta">Kostenlose Beratung anfragen →</button>
        </div>

        <div class="rechner-empty" hidden>Bitte wählen Sie oben einen Pflegegrad, um die Berechnung zu starten.</div>
      </div>
    `;

    const state = { pg: null, visibleVisits: 1, visits: [...CONFIG.defaults] };
    const $ = sel => root.querySelector(sel);
    const $$ = sel => root.querySelectorAll(sel);

    function buildVisit(i){
      const wrap = document.createElement("div");
      wrap.className = "rechner-slider-row";
      wrap.dataset.idx = i;
      wrap.innerHTML = `
        <div class="rechner-slider-label">
          <span>Besuch ${i+1}</span>
          <span class="rechner-slider-val">${state.visits[i]} min</span>
        </div>
        <input type="range" min="${CONFIG.minVisitMinutes}" max="${CONFIG.maxVisitMinutes}" step="${CONFIG.stepMinutes}" value="${state.visits[i]}" class="rechner-slider" aria-label="Besuch ${i+1} Dauer in Minuten">
      `;
      const slider = wrap.querySelector(".rechner-slider");
      const valEl = wrap.querySelector(".rechner-slider-val");
      slider.addEventListener("input", e => {
        state.visits[i] = +e.target.value;
        valEl.textContent = state.visits[i] + " min";
        update();
      });
      return wrap;
    }

    function renderVisits(){
      const container = $(".rechner-visits");
      container.innerHTML = "";
      for (let i = 0; i < state.visibleVisits; i++) container.appendChild(buildVisit(i));
      const addBtn = $(".rechner-add");
      addBtn.hidden = state.visibleVisits >= CONFIG.maxVisitsPerDay || !state.pg;
    }

    function update(){
      const hasPG = !!state.pg;
      $(".rechner-empty").hidden = hasPG;
      $(".rechner-step-2").dataset.active = hasPG ? "true" : "false";

      if (!hasPG){
        $(".rechner-empfehlung").hidden = true;
        $(".rechner-result").hidden = true;
        return;
      }

      const rec = CONFIG.recommendations[state.pg];
      const betrag = CONFIG.sachleistungen[state.pg];
      $(".rechner-empfehlung").hidden = false;
      $(".rechner-empfehlung-text").innerHTML =
        `Bei Pflegegrad <strong>${state.pg}</strong> stehen Ihnen monatlich bis zu <strong>${EUR(betrag)}</strong> an Pflegesachleistungen zu. Das entspricht ca. <strong>${rec.visits} Besuche${rec.visits>1?'':''} à ${rec.minutesPerVisit} Minuten</strong> ohne private Zuzahlung.`;

      const r = calc(state);
      const result = $(".rechner-result");
      const msg = $(".rechner-result-msg");

      if (r.totalMin === 0){
        result.hidden = true;
        return;
      }
      result.hidden = false;
      $(".r-gesamt").textContent = EUR(r.gesamt);
      $(".r-kasse").textContent = "−" + EUR(r.kasse);
      $(".r-zuzahlung").textContent = EUR(r.zuzahlung) + "/Monat";

      if (r.zuzahlung === 0){
        msg.hidden = false;
        msg.className = "rechner-result-msg rechner-msg-success";
        msg.textContent = "✓ Keine Zuzahlung — komplett über die Pflegekasse gedeckt!";
      } else if (r.zuzahlung > 3000){
        msg.hidden = false;
        msg.className = "rechner-result-msg rechner-msg-warn";
        msg.textContent = "ℹ️ Hoher Eigenanteil — wir empfehlen ein kostenloses Beratungsgespräch, um Alternativen zu prüfen.";
      } else {
        msg.hidden = true;
      }
    }

    $$(".rechner-pg-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        state.pg = +btn.dataset.pg;
        $$(".rechner-pg-btn").forEach(b => {
          const active = +b.dataset.pg === state.pg;
          b.classList.toggle("active", active);
          b.setAttribute("aria-checked", active ? "true" : "false");
        });
        if (state.visibleVisits === 1){
          const rec = CONFIG.recommendations[state.pg];
          state.visibleVisits = Math.min(rec.visits, CONFIG.maxVisitsPerDay);
          state.visits = [...CONFIG.defaults];
          for (let i = 0; i < state.visibleVisits; i++){
            state.visits[i] = rec.minutesPerVisit;
          }
        }
        renderVisits();
        update();
      });
    });

    $(".rechner-add").addEventListener("click", () => {
      if (state.visibleVisits < CONFIG.maxVisitsPerDay){
        state.visibleVisits++;
        renderVisits();
        update();
      }
    });

    $(".rechner-cta").addEventListener("click", () => {
      const target = opts.ctaHref || "#kontakt";
      window.location.href = target;
    });

    renderVisits();
    update();
  }

  global.PanaceaRechner = {
    init(selector, opts){
      const root = typeof selector === "string" ? document.querySelector(selector) : selector;
      if (!root) return;
      render(root, opts || {});
    },
    CONFIG
  };
})(window);
