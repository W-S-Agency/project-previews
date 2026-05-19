
(function() {
  const PROJECT = 'renovira';
  const PAGE = window.FB_PAGE || 'unknown';
  const PAGE_TITLE = window.FB_PAGE_TITLE || 'unknown';
  const STORAGE_KEY = '2p-feedback-' + PROJECT;

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch(e) { return {}; }
  }
  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
  function getCount() {
    const data = load();
    let count = 0;
    for (const page in data) {
      for (const block in data[page].blocks || {}) {
        if (data[page].blocks[block]) count++;
      }
    }
    return count;
  }
  function updateCounter() {
    const btn = document.querySelector('.fb-counter-btn');
    if (btn) {
      const n = getCount();
      btn.textContent = '📥 Feedback: ' + n + ' Kommentar' + (n === 1 ? '' : 'e');
    }
  }

  // Render Vorschlag-Buttons next to each block
  function renderVorschlagButtons() {
    const blocks = document.querySelectorAll('section.block');
    const data = load();
    const pageData = data[PAGE] || { title: PAGE_TITLE, blocks: {} };
    blocks.forEach((block, i) => {
      const blockId = 'b' + i;
      const blockName = block.querySelector('h1, h2, h3')?.textContent?.trim().slice(0, 40) || ('Block ' + (i+1));
      const btn = document.createElement('button');
      btn.className = 'fb-vorschlag-btn';
      btn.textContent = '✏️ Vorschlag';
      btn.dataset.blockId = blockId;
      btn.dataset.blockName = blockName;
      if (pageData.blocks && pageData.blocks[blockId]) {
        btn.classList.add('has-comment');
      }
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        let panel = block.querySelector('.fb-panel');
        if (!panel) {
          panel = createPanel(blockId, blockName, pageData.blocks?.[blockId] || '');
          block.querySelector('.container')?.appendChild(panel);
        }
        panel.classList.toggle('open');
      });
      const container = block.querySelector('.container');
      if (container) container.insertBefore(btn, container.firstChild);
    });
  }

  function createPanel(blockId, blockName, currentValue) {
    const panel = document.createElement('div');
    panel.className = 'fb-panel';
    panel.innerHTML = `
      <label style="display:block;margin-bottom:6px;font-weight:600;font-size:13px;">Kommentar zu „${blockName}":</label>
      <textarea placeholder="Ihr Vorschlag oder Kommentar…">${currentValue}</textarea>
      <div class="fb-panel-actions">
        <button type="button" class="fb-btn-save">Speichern</button>
        <button type="button" class="fb-btn-delete">Löschen</button>
      </div>
    `;
    panel.querySelector('.fb-btn-save').addEventListener('click', function() {
      const value = panel.querySelector('textarea').value.trim();
      const data = load();
      if (!data[PAGE]) data[PAGE] = { title: PAGE_TITLE, blocks: {} };
      if (value) {
        data[PAGE].blocks[blockId] = value;
      } else {
        delete data[PAGE].blocks[blockId];
      }
      save(data);
      panel.closest('.block').querySelector('.fb-vorschlag-btn').classList.toggle('has-comment', !!value);
      panel.classList.remove('open');
      updateCounter();
    });
    panel.querySelector('.fb-btn-delete').addEventListener('click', function() {
      panel.querySelector('textarea').value = '';
      const data = load();
      if (data[PAGE]?.blocks) {
        delete data[PAGE].blocks[blockId];
        save(data);
      }
      panel.closest('.block').querySelector('.fb-vorschlag-btn').classList.remove('has-comment');
      panel.classList.remove('open');
      updateCounter();
    });
    return panel;
  }

  // Render Feedback Counter Overlay
  function renderCounter() {
    const wrap = document.createElement('div');
    wrap.className = 'fb-counter-wrap';
    wrap.innerHTML = '<button class="fb-counter-btn">📥 Feedback: 0 Kommentare</button>';
    document.body.appendChild(wrap);
    wrap.querySelector('.fb-counter-btn').addEventListener('click', openOverlay);

    const overlay = document.createElement('div');
    overlay.className = 'fb-overlay';
    overlay.innerHTML = '<div class="fb-overlay-content"></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.classList.remove('open');
    });
    updateCounter();
  }

  function openOverlay() {
    const data = load();
    const overlay = document.querySelector('.fb-overlay');
    const content = overlay.querySelector('.fb-overlay-content');
    let html = '<h3>Ihre Kommentare</h3>';
    const totalCount = getCount();
    html += '<p style="color:#6b7280;font-size:14px;">' + totalCount + ' Kommentar' + (totalCount === 1 ? '' : 'e') + ' insgesamt</p>';
    html += '<div class="fb-overlay-comments">';
    let hasAny = false;
    for (const page in data) {
      const pageData = data[page];
      const pageBlocks = pageData.blocks || {};
      const pageCommentKeys = Object.keys(pageBlocks).filter(k => pageBlocks[k]);
      if (pageCommentKeys.length > 0) {
        hasAny = true;
        html += '<div class="fb-overlay-page"><h4>━━━ ' + escapeHtml(pageData.title || page) + ' ━━━</h4>';
        pageCommentKeys.forEach(blockId => {
          html += '<div class="fb-overlay-block"><strong>📌 ' + escapeHtml(blockId) + '</strong><div>' + escapeHtml(pageBlocks[blockId]) + '</div></div>';
        });
        html += '</div>';
      }
    }
    if (!hasAny) {
      html += '<p style="color:#6b7280;text-align:center;padding:24px;">Noch keine Kommentare. Klicken Sie auf „✏️ Vorschlag" neben einem Block, um einen Kommentar zu hinterlassen.</p>';
    }
    html += '</div>';
    if (hasAny) {
      html += '<div class="fb-overlay-actions">' +
        '<button onclick="window.FB_export_txt()">📥 Als Datei herunterladen</button>' +
        '<button onclick="window.FB_copy_clipboard()">📋 In Zwischenablage kopieren</button>' +
        '</div>';
    }
    html += '<div class="fb-overlay-actions"><button class="fb-overlay-close" onclick="this.closest(\'.fb-overlay\').classList.remove(\'open\')">Schließen</button></div>';
    content.innerHTML = html;
    overlay.classList.add('open');
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function buildExportText() {
    const data = load();
    const today = new Date();
    const dateStr = today.toLocaleDateString('de-DE');
    const timeStr = today.toLocaleTimeString('de-DE');
    let count = getCount();
    let out = 'FEEDBACK — Renovira Preview\nDatum: ' + dateStr + '\n' + count + ' Kommentar(e) insgesamt\n' + '='.repeat(50) + '\n\n';
    for (const page in data) {
      const pageData = data[page];
      const pageBlocks = pageData.blocks || {};
      const keys = Object.keys(pageBlocks).filter(k => pageBlocks[k]);
      if (keys.length > 0) {
        out += '━━━ ' + (pageData.title || page) + ' ━━━\n\n';
        keys.forEach(blockId => {
          out += '📌 ' + blockId + '\n' + '-'.repeat(40) + '\n' + pageBlocks[blockId] + '\n\n';
        });
      }
    }
    out += '='.repeat(50) + '\nErstellt am ' + dateStr + ', ' + timeStr;
    return out;
  }

  window.FB_export_txt = function() {
    const text = buildExportText();
    const today = new Date().toISOString().slice(0, 10);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'feedback_renovira_' + today + '.txt';
    a.click();
  };
  window.FB_copy_clipboard = function() {
    const text = buildExportText();
    navigator.clipboard.writeText(text).then(function() {
      alert('✓ Kommentare in Zwischenablage kopiert.');
    });
  };

  // Init
  if (window.FB_ENABLED) {
    document.addEventListener('DOMContentLoaded', function() {
      renderVorschlagButtons();
      renderCounter();
    });
  }

  // ── Lead-Magnet Tab Switching (D-FB-018-010) ──
  document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.lm-tabs').forEach(function(tabs) {
      const tabButtons = tabs.querySelectorAll('.lm-tab');
      const panels = tabs.parentElement.querySelectorAll('.lm-panel');
      tabButtons.forEach(function(btn) {
        btn.addEventListener('click', function() {
          const target = btn.dataset.target;
          tabButtons.forEach(b => {
            b.classList.toggle('active', b === btn);
            b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
          });
          panels.forEach(p => {
            p.classList.toggle('active', p.id === target);
          });
        });
      });
    });
  });

  // ── Reviews Slider Auto-Rotate (D-FB-018-001) ──
  document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.reviews-slider').forEach(function(slider) {
      const slides = slider.querySelectorAll('.review-slide');
      const dots = slider.querySelectorAll('.review-dot');
      if (slides.length <= 1) return;
      let current = 0;
      let timer = null;
      function show(idx) {
        slides.forEach((s, i) => s.classList.toggle('active', i === idx));
        dots.forEach((d, i) => d.classList.toggle('active', i === idx));
        current = idx;
      }
      function next() { show((current + 1) % slides.length); }
      function startTimer() { timer = setInterval(next, 5000); }
      function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
      dots.forEach(function(dot, i) {
        dot.addEventListener('click', function() {
          stopTimer();
          show(i);
          startTimer();
        });
      });
      startTimer();
    });
  });
})();
