(() => {
  'use strict';

  const HOUR_HEIGHT = 72;
  const DAY_START = 7 * 60;
  const DAY_END = 24 * 60;
  const dragState = new WeakMap();
  let planPaintToken = 0;
  let enhanceQueued = false;
  let minuteTimer = null;

  function parseRange(text) {
    const m = String(text || '').match(/(\d{2}):(\d{2})\s*[–-]\s*(\d{2}):(\d{2})/);
    if (!m) return null;
    const start = Number(m[1]) * 60 + Number(m[2]);
    const end = Number(m[3]) * 60 + Number(m[4]);
    return end > start ? { start, end, minutes: end - start } : null;
  }

  function fitTimelineBlock(block) {
    const range = parseRange(block.querySelector('.block-time')?.textContent);
    if (!range) return null;

    const realHeight = Math.max(14, (range.minutes / 60) * HOUR_HEIGHT - 4);
    block.style.setProperty('height', `${realHeight}px`, 'important');
    block.classList.remove('hm-micro', 'hm-short', 'hm-medium', 'hm-compact', 'hm-tiny');
    if (range.minutes <= 18) block.classList.add('hm-micro');
    else if (range.minutes <= 30) block.classList.add('hm-short');
    else if (range.minutes <= 45) block.classList.add('hm-medium');
    return range;
  }

  function layoutOverlapGroup(group) {
    if (!group.length) return;
    const laneEnds = [];
    for (const item of group) {
      let lane = laneEnds.findIndex(end => end <= item.start);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = item.end;
      item.lane = lane;
    }
    const count = laneEnds.length;
    for (const item of group) {
      const block = item.block;
      if (count <= 1) {
        block.classList.remove('hm-lane');
        block.style.setProperty('left', '10px', 'important');
        block.style.setProperty('right', '14px', 'important');
        continue;
      }
      block.classList.add('hm-lane');
      const leftPct = item.lane / count * 100;
      const rightPct = (count - item.lane - 1) / count * 100;
      const leftPad = item.lane === 0 ? 10 : 4;
      const rightPad = item.lane === count - 1 ? 14 : 4;
      block.style.setProperty('left', `calc(${leftPct}% + ${leftPad}px)`, 'important');
      block.style.setProperty('right', `calc(${rightPct}% + ${rightPad}px)`, 'important');
    }
  }

  function layoutTimeline(timeline) {
    if (!timeline) return;
    const items = [...timeline.querySelectorAll('.time-block')]
      .map(block => {
        const range = fitTimelineBlock(block);
        return range ? { block, ...range } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.start - b.start || a.end - b.end);

    let group = [];
    let groupEnd = -1;
    for (const item of items) {
      if (!group.length || item.start < groupEnd) {
        group.push(item);
        groupEnd = Math.max(groupEnd, item.end);
      } else {
        layoutOverlapGroup(group);
        group = [item];
        groupEnd = item.end;
      }
    }
    layoutOverlapGroup(group);
    drawNowLine(timeline);
  }

  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function drawNowLine(timeline) {
    timeline.querySelector('.hm-now-line')?.remove();
    if (timeline.dataset.timelineDate !== todayISO()) return;
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    if (mins < DAY_START || mins > DAY_END) return;
    const top = (mins - DAY_START) / 60 * HOUR_HEIGHT;
    const line = document.createElement('div');
    line.className = 'hm-now-line';
    line.style.top = `${top}px`;
    const label = document.createElement('span');
    label.className = 'hm-now-label';
    label.textContent = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    line.appendChild(label);
    timeline.appendChild(line);
  }

  function fitTimelineBlocks(root = document) {
    const timelines = [];
    if (root.matches?.('.timeline')) timelines.push(root);
    root.querySelectorAll?.('.timeline').forEach(t => timelines.push(t));
    if (!timelines.length) {
      const tl = root.closest?.('.timeline');
      if (tl) timelines.push(tl);
    }
    [...new Set(timelines)].forEach(layoutTimeline);
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
        if (block.status === 'complete') { cls = 'hm-status-complete'; label = 'Tamamlandı'; }
        else if (block.status === 'partial') { cls = 'hm-status-partial'; label = 'Kısmen tamamlandı'; }
        else if (block.status === 'incomplete') { cls = 'hm-status-incomplete'; label = 'Tamamlanmadı'; }

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

  function scheduleEnhance(){
    if(enhanceQueued)return;
    enhanceQueued=true;
    requestAnimationFrame(()=>{
      enhanceQueued=false;
      enhance(document.getElementById('view')||document);
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
        if (node.matches?.('.timeline, .time-block, .week-block[data-plan-block], .dashboard-grid, .week-board') || node.querySelector?.('.timeline, .time-block, .week-block[data-plan-block]')) {
          scheduleEnhance();
          return;
        }
      }
    }
  });

  function stopMinuteTimer(){if(minuteTimer){clearTimeout(minuteTimer);minuteTimer=null;}}
  function startMinuteTimer(){
    stopMinuteTimer();
    if(document.hidden)return;
    const delay=Math.max(1000,60050-(Date.now()%60000));
    minuteTimer=setTimeout(()=>{
      minuteTimer=null;
      document.querySelectorAll('.timeline').forEach(drawNowLine);
      startMinuteTimer();
    },delay);
  }

  function init() {
    enhance();
    const view = document.getElementById('view');
    if (view) observer.observe(view, { childList: true });
    startMinuteTimer();
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden)stopMinuteTimer();
      else{scheduleEnhance();startMinuteTimer();}
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
