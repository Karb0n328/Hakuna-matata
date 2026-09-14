(() => {
  'use strict';

  const dragState = new WeakMap();

  function parseMinutes(text) {
    const m = String(text || '').match(/(\d{2}):(\d{2})\s*[–-]\s*(\d{2}):(\d{2})/);
    if (!m) return null;
    const start = Number(m[1]) * 60 + Number(m[2]);
    const end = Number(m[3]) * 60 + Number(m[4]);
    return end > start ? end - start : null;
  }

  function classifyBlocks(root = document) {
    root.querySelectorAll?.('.time-block').forEach(block => {
      const minutes = parseMinutes(block.querySelector('.block-time')?.textContent);
      if (!minutes) return;
      block.classList.remove('hm-tiny', 'hm-compact');
      if (minutes <= 25) block.classList.add('hm-tiny');
      else if (minutes <= 45) block.classList.add('hm-compact');
    });
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
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches?.('.time-block') || node.querySelector?.('.time-block')) classifyBlocks(node.matches?.('.time-block') ? node.parentElement : node);
      }
    }
  });

  function init() {
    classifyBlocks();
    const view = document.getElementById('view');
    if (view) observer.observe(view, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
