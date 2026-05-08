/* Panacea Pflegekostenrechner V2 — funktionaler Preview-Widget
   Basiert auf docs/TZ_Kostenrechner_v2.md §4
   Quelle: TY-Feedback chat3436 #254441 (01.05.2026)
   Standalone, keine Dependencies. Initialisierung: PanaceaRechner.init("#container-id") */
(function(global){
  const CONFIG = {
    version: "2.0",
    lastUpdated: "2026-05-04",
    hourlyRate: 70.44,                  // €/h (TY 01.05.2026)
    anfahrtPrice: 7.96,                 // € pro Besuch
    anfahrtPriceWithVerordnung: 3.98,   // € pro Besuch mit ärztlicher Verordnung (= /2)
    pgZuschuss: 424,                    // € zu jedem PG-Budget
    daysPerMonth: 30,
    minVisitMinutes: 10,
    maxVisitMinutes: 60,                // V1: 120 → V2: 60 (TY)
    stepMinutes: 5,
    maxVisitsPerDay: 3,
    sachleistungen: { 2: 796, 3: 1497, 4: 1859, 5: 2299 },
    recommendations: {
      2: {
        visits: 1, minutesPerVisit: 40,
        hint: "Bei Pflegegrad 2 reicht das Budget ohne Zuzahlung für ca. 3 Besuche pro Woche à 1 Stunde. Tägliche Besuche erfordern Zuzahlung."
      },
      3: { visits: 2, minutesPerVisit: 30 },
      4: { visits: 2, minutesPerVisit: 45 },
      5: { visits: 3, minutesPerVisit: 40 }
    },
    defaults: [40, 20, 30]              // V1: [40,20,10] → V2: [40,20,30] (TY)
  };

  const EUR = n => n.toLocaleString("de-DE", { maximumFractionDigits: 0 }) + " €";
  const minutePrice = () => CONFIG.hourlyRate / 60;
  const anfahrt = (verordnung) => verordnung ? CONFIG.anfahrtPriceWithVerordnung : CONFIG.anfahrtPrice;
  const budgetPG = (pg) => pg ? (CONFIG.sachleistungen[pg] + CONFIG.pgZuschuss) : 0;

  function calc(state){
    if (!state.pg || state.visibleVisits === 0) {
      return { totalMin: 0, gesamt: 0, zeitMonat: 0, anfahrtMonat: 0, kasse: 0, zuzahlung: 0, budget: 0 };
    }
    // активные визиты — берём первые `visibleVisits` элементов
    const aktive = state.visits.slice(0, state.visibleVisits);
    const totalMin = aktive.reduce((s,v) => s + v, 0);
    const tagZeit = totalMin * minutePrice();
    const tagAnfahrt = state.visibleVisits * anfahrt(state.verordnung);
    const tagTotal = tagZeit + tagAnfahrt;
    const gesamt = tagTotal * CONFIG.daysPerMonth;
    const zeitMonat = tagZeit * CONFIG.daysPerMonth;
    const anfahrtMonat = tagAnfahrt * CONFIG.daysPerMonth;
    const budget = budgetPG(state.pg);
    const kasse = Math.min(gesamt, budget);
    const zuzahlung = Math.max(0, gesamt - kasse);
    return { totalMin, gesamt, zeitMonat, anfahrtMonat, kasse, zuzahlung, budget };
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

        <div class="rechner-pg-hint" hidden></div>

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
          <div class="rechner-hint">Schrittweite 5 min · max. 60 min/Besuch · max. 3 Besuche/Tag</div>

          <label class="rechner-verordnung">
            <input type="checkbox" class="rechner-verordnung-checkbox">
            <span class="rechner-verordnung-label">
              <strong>Ärztliche Verordnung vorhanden</strong>
              <span class="rechner-verordnung-hint">(z.B. Kompressionsstrümpfe, Tabletten, Insulin) — die Anfahrtspauschale halbiert sich.</span>
            </span>
          </label>
        </div>

        <div class="rechner-result" hidden>
          <div class="rechner-result-label">Zusammenfassung</div>
          <div class="rechner-row"><span>Geschätzte Gesamtkosten / Monat</span><strong class="r-gesamt">0 €</strong></div>
          <div class="rechner-row rechner-row-sub"><span>Davon Pflegezeit (${CONFIG.hourlyRate.toString().replace('.',',')} €/h × ${CONFIG.daysPerMonth} Tage)</span><span class="r-zeit">0 €</span></div>
          <div class="rechner-row rechner-row-sub"><span>Davon Anfahrt (<span class="r-anfahrt-preis">7,96 €</span> × <span class="r-anfahrt-anzahl">0</span> Besuche × ${CONFIG.daysPerMonth} Tage)</span><span class="r-anfahrt">0 €</span></div>
          <div class="rechner-row"><span>Davon Pflegekasse (Budget <span class="r-budget">0 €</span>)</span><strong class="r-kasse">−0 €</strong></div>
          <div class="rechner-row rechner-row-final"><span><strong>Ihre Zuzahlung</strong></span><strong class="r-zuzahlung">0 €/Monat</strong></div>
          <div class="rechner-result-msg" hidden></div>
          <div class="rechner-disclaimer">Alle Angaben unverbindlich · individuell im Beratungsgespräch</div>
          <button type="button" class="rechner-cta">Kostenlose Beratung anfragen →</button>
        </div>

        <div class="rechner-empty" hidden>Bitte wählen Sie oben einen Pflegegrad, um die Berechnung zu starten.</div>
      </div>
    `;

    const state = {
      pg: null,
      visibleVisits: 1,
      visits: [...CONFIG.defaults],
      verordnung: false
    };
    const $ = sel => root.querySelector(sel);
    const $$ = sel => root.querySelectorAll(sel);

    function buildVisit(i){
      const wrap = document.createElement("div");
      wrap.className = "rechner-slider-row";
      wrap.dataset.idx = i;
      const removable = i > 0; // Besuch 1 nicht entfernbar
      wrap.innerHTML = `
        <div class="rechner-slider-label">
          <span>Besuch ${i+1}</span>
          <span class="rechner-slider-val">${state.visits[i]} min</span>
          ${removable ? `<button type="button" class="rechner-remove" aria-label="Besuch ${i+1} entfernen" title="Besuch entfernen">✕</button>` : ''}
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
      const removeBtn = wrap.querySelector(".rechner-remove");
      if (removeBtn){
        removeBtn.addEventListener("click", () => {
          // Удаляем визит i: все после сдвигаются вверх; visibleVisits--
          state.visits.splice(i, 1);
          // Восстанавливаем длину массива до 3 для дефолтов
          while (state.visits.length < CONFIG.defaults.length){
            state.visits.push(CONFIG.defaults[state.visits.length] || CONFIG.minVisitMinutes);
          }
          state.visibleVisits = Math.max(1, state.visibleVisits - 1);
          renderVisits();
          update();
        });
      }
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

      // PG-spezifischer Hint (nur PG2 hat einen)
      const hintEl = $(".rechner-pg-hint");
      const rec = hasPG ? CONFIG.recommendations[state.pg] : null;
      if (hasPG && rec && rec.hint){
        hintEl.hidden = false;
        hintEl.textContent = "ℹ️ " + rec.hint;
      } else {
        hintEl.hidden = true;
      }

      if (!hasPG){
        $(".rechner-empfehlung").hidden = true;
        $(".rechner-result").hidden = true;
        return;
      }

      // Empfehlung
      const budget = budgetPG(state.pg);
      $(".rechner-empfehlung").hidden = false;
      $(".rechner-empfehlung-text").innerHTML =
        `Bei Pflegegrad <strong>${state.pg}</strong> stehen Ihnen monatlich bis zu <strong>${EUR(budget)}</strong> zur Verfügung (${EUR(CONFIG.sachleistungen[state.pg])} Pflegesachleistung + ${EUR(CONFIG.pgZuschuss)} Zuschuss). Das entspricht ca. <strong>${rec.visits} Besuche${rec.visits>1?'':''} à ${rec.minutesPerVisit} Minuten</strong> ohne private Zuzahlung.`;

      const r = calc(state);
      const result = $(".rechner-result");
      const msg = $(".rechner-result-msg");

      if (r.totalMin === 0){
        result.hidden = true;
        return;
      }
      result.hidden = false;
      $(".r-gesamt").textContent = EUR(r.gesamt);
      $(".r-zeit").textContent = EUR(r.zeitMonat);
      $(".r-anfahrt").textContent = EUR(r.anfahrtMonat);
      $(".r-anfahrt-anzahl").textContent = state.visibleVisits;
      $(".r-anfahrt-preis").textContent = anfahrt(state.verordnung).toLocaleString("de-DE", {minimumFractionDigits: 2, maximumFractionDigits: 2}) + " €";
      $(".r-budget").textContent = EUR(r.budget);
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
        // При первом выборе PG: применяем рекомендованные defaults
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

    $(".rechner-verordnung-checkbox").addEventListener("change", e => {
      state.verordnung = e.target.checked;
      update();
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
    CONFIG,
    calc  // exportiert für Tests
  };
})(window);
