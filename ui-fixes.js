(() => {
  'use strict';

  const CORE_HOUR_HEIGHT = 72;
  const dragState = new WeakMap();
  let planPaintToken = 0;

  function parseMinutes(text) {
    const m = String(text || '').match(/(\d{2}):(\d{2})\s*[–-]\s*(\d{2}):(\d{2})/);
    if (!m) return null;
    const start = Number(m[1]) * 60 + Number(m[2]);
    const end = Number(m[3]) * 60 + Number(m[4]);
    return end > start ? end - start : null;
  }

  function fitTimelineBlock(block) {
    const minutes = parseMinutes(block.querySelector('.block-time')?.textContent);
    if (!minutes) return;

    // app.js kısa blokları Math.max(38, ...) ile çizdiği için art arda gelen
    // 15–30 dk bloklar birbirinin üzerine biniyordu. Burada yüksekliği gerçek
    // zaman ölçeğine geri getiriyoruz. 4 px aralık app.js ile aynı kalır.
    const realHeight = Math.max(8, (minutes / 60) * CORE_HOUR_HEIGHT - 4);
    block.style.height = `${realHeight}px`;

    block.classList.remove('hm-micro', 'hm-tiny', 'hm-compact');
    if (minutes <= 18) block.classList.add('hm-micro');
    else if (minutes <= 30) block.classList.add('hm-tiny');
    else if (minutes <= 45) block.classList.add('hm-compact');
  }

  function fitTimelineBlocks(root = document) {
    root.querySelectorAll?.('.time-block').forEach(fitTimelineBlock);
    if (root.matches?.('.time-block')) fitTimelineBlock(root);
  }

  function openHakunaDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('hakuna-matata-db', 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function readState() {
    const db = await openHakunaDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('app', 'readonly');
      const req = tx.objectStore('app').get('state');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  }

  async function paintPlanStatuses(root = document) {
    const weekBlocks = [...root.querySelectorAll?.('.week-block[data-plan-block]') || []];
    if (root.matches?.('.week-block[data-plan-block]')) weekBlocks.push(root);
    if (!weekBlocks.length) return;

    const token = ++planPaintToken;
    try {
      const state = await readState();
      if (token !== planPaintToken || !state?.blocks) return;
      const byId = new Map(state.blocks.map(b => [b.id, b]));

      weekBlocks.forEach(el => {
        const block = byId.get(el.dataset.planBlock);
        if (!block) return;

        el.classList.remove('hm-status-complete', 'hm-status-partial', 'hm-status-incomplete');
        el.querySelector('.hm-plan-status-icon')?.remove();
        el.removeAttribute('title');
        el.removeAttribute('aria-label');

        let cls = '';
        let label = '';
        if (block.status === 'complete') {
          cls = 'hm-status-complete'; label = 'Tamamlandı';
        } else if (block.status === 'partial') {
          cls = 'hm-status-partial'; label = 'Kısmen tamamlandı';
        } else if (block.status === 'incomplete') {
          cls = 'hm-status-incomplete'; label = 'Tamamlanmadı';
        }

        if (cls) {
          el.classList.add(cls);
          el.setAttribute('aria-label', `${el.textContent.trim()} — ${label}`);
          el.title = label;
        }
      });
    } catch (err) {
      console.warn('Plan durumu boyanamadı:', err);
    }
  }

  function enhance(root = document) {
    fitTimelineBlocks(root);
    paintPlanStatuses(root);
  }

  document.addEventListener('pointerdown', e => {
    const row = e.target.closest?.('.debt-row');
    if (!row) return;
    dragState.set(row, { x: e.clientX, y: e.clientY, dragged: false });
  }, true);

  document.addEventListener('pointermove', e => {
    const row = e.target.closest?.('.debt-row');
    if (!row) return;
    const s = dragState.get(row);
    if (!s) return;
    if (Math.abs(e.clientX - s.x) > 10 || Math.abs(e.clientY - s.y) > 10) s.dragged = true;
  }, true);

  document.addEventListener('click', e => {
    const row = e.target.closest?.('.debt-row');
    if (!row) return;
    if (e.target.closest('[data-schedule-debt], [data-delete-debt]')) return;
    const s = dragState.get(row);
    if (s?.dragged) {
      dragState.delete(row);
      return;
    }
    const scheduleButton = row.querySelector('[data-schedule-debt]');
    if (scheduleButton) {
      e.preventDefault();
      scheduleButton.click();
    }
  });

  const observer = new MutationObserver(records => {
    let needsEnhance = false;
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (
          node.matches?.('.time-block, .week-block[data-plan-block]') ||
          node.querySelector?.('.time-block, .week-block[data-plan-block]')
        ) {
          needsEnhance = true;
          break;
        }
      }
      if (needsEnhance) break;
    }
    if (needsEnhance) requestAnimationFrame(() => enhance());
  });

  function init() {
    enhance();
    const view = document.getElementById('view');
    if (view) observer.observe(view, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
