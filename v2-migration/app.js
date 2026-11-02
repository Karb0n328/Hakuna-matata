(() => {
  'use strict';

  const LEGACY_DB = 'hakuna-matata-db';
  const LEGACY_STORE = 'app';
  const LEGACY_KEY = 'state';

  const $ = (selector) => document.querySelector(selector);
  const statusEl = $('#status');
  const detailsEl = $('#details');
  const downloadButton = $('#downloadSnapshot');

  let currentSnapshot = null;

  function setStatus(kind, title, text) {
    statusEl.className = `status ${kind}`;
    statusEl.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(text)}</span>`;
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
  }

  function stableStringify(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }

  async function sha256Hex(text) {
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  function cloneJson(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function countState(state) {
    const count = (key) => Array.isArray(state?.[key]) ? state[key].length : 0;
    return {
      blocks: count('blocks'),
      tasks: count('tasks'),
      debts: count('debts'),
      exams: count('exams'),
      questions: count('questions')
    };
  }

  function validateStateShape(state) {
    if (!state || typeof state !== 'object' || Array.isArray(state)) {
      throw new Error('Legacy state bulunamadı veya beklenen obje formatında değil.');
    }

    const knownCollections = ['blocks', 'tasks', 'debts', 'exams', 'questions'];
    for (const key of knownCollections) {
      if (state[key] !== undefined && !Array.isArray(state[key])) {
        throw new Error(`Legacy state.${key} beklenen dizi formatında değil.`);
      }
    }
  }

  async function legacyDatabaseExists() {
    if (typeof indexedDB.databases !== 'function') return null;
    const databases = await indexedDB.databases();
    return databases.some((database) => database.name === LEGACY_DB);
  }

  function openLegacyDatabaseReadOnly() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(LEGACY_DB);
      let createdByProbe = false;

      request.onupgradeneeded = () => {
        // A missing DB would cause open() to create one. Abort immediately instead.
        createdByProbe = true;
        try { request.transaction?.abort(); } catch (_) {}
      };

      request.onerror = () => {
        if (createdByProbe || request.error?.name === 'AbortError') {
          reject(new Error('Legacy Hakuna veritabanı bu origin üzerinde bulunamadı.'));
          return;
        }
        reject(request.error || new Error('Legacy veritabanı açılamadı.'));
      };

      request.onsuccess = () => {
        if (createdByProbe) {
          request.result.close();
          reject(new Error('Legacy Hakuna veritabanı bulunamadı.'));
          return;
        }
        resolve(request.result);
      };
    });
  }

  async function readLegacyState() {
    const exists = await legacyDatabaseExists();
    if (exists === false) throw new Error('Legacy Hakuna veritabanı bulunamadı.');

    const db = await openLegacyDatabaseReadOnly();
    try {
      if (!db.objectStoreNames.contains(LEGACY_STORE)) {
        throw new Error(`Legacy '${LEGACY_STORE}' store bulunamadı.`);
      }

      return await new Promise((resolve, reject) => {
        const transaction = db.transaction(LEGACY_STORE, 'readonly');
        const request = transaction.objectStore(LEGACY_STORE).get(LEGACY_KEY);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Legacy state okunamadı.'));
        transaction.onerror = () => reject(transaction.error || new Error('Read-only transaction başarısız.'));
      });
    } finally {
      db.close();
    }
  }

  async function buildSnapshot() {
    const state = await readLegacyState();
    validateStateShape(state);

    // Clone before hashing/exporting so the original IndexedDB value is never mutated.
    const safeState = cloneJson(state);
    const canonicalState = stableStringify(safeState);
    const stateHash = await sha256Hex(canonicalState);

    return {
      schema: 'hakuna.legacy-snapshot.v1',
      createdAt: new Date().toISOString(),
      source: {
        db: LEGACY_DB,
        store: LEGACY_STORE,
        key: LEGACY_KEY,
        mode: 'readonly'
      },
      sourceStateVersion: safeState.version ?? null,
      stateHash,
      counts: countState(safeState),
      state: safeState
    };
  }

  function renderSnapshot(snapshot) {
    const counts = snapshot.counts;
    const unknownTopLevelKeys = Object.keys(snapshot.state).filter((key) => ![
      'version', 'selectedDate', 'blocks', 'tasks', 'debts', 'exams', 'questions', 'settings'
    ].includes(key));

    detailsEl.innerHTML = `
      <div class="grid">
        <div class="metric"><span>Çalışma blokları</span><strong>${counts.blocks}</strong></div>
        <div class="metric"><span>Görevler</span><strong>${counts.tasks}</strong></div>
        <div class="metric"><span>Borçlar</span><strong>${counts.debts}</strong></div>
        <div class="metric"><span>Denemeler</span><strong>${counts.exams}</strong></div>
        <div class="metric"><span>Sorular</span><strong>${counts.questions}</strong></div>
      </div>
      <div class="hash"><span>SHA-256</span><code>${escapeHtml(snapshot.stateHash)}</code></div>
      <div class="meta">State version: ${escapeHtml(snapshot.sourceStateVersion ?? '—')}</div>
      <div class="meta">Bilinmeyen üst-seviye alanlar da snapshot içinde korunur: ${unknownTopLevelKeys.length ? escapeHtml(unknownTopLevelKeys.join(', ')) : 'yok'}</div>
    `;

    detailsEl.hidden = false;
    downloadButton.disabled = false;
  }

  function downloadSnapshot(snapshot) {
    const payload = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.href = url;
    link.download = `Hakuna-PreMigration-${stamp}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function audit() {
    downloadButton.disabled = true;
    detailsEl.hidden = true;
    setStatus('working', 'Legacy veri okunuyor', 'Sadece readonly IndexedDB transaction kullanılıyor.');

    try {
      currentSnapshot = await buildSnapshot();
      renderSnapshot(currentSnapshot);
      setStatus('safe', 'Snapshot hazır', 'Eski veritabanına hiçbir yazma/silme işlemi yapılmadı.');
    } catch (error) {
      currentSnapshot = null;
      setStatus('error', 'Snapshot oluşturulamadı', error?.message || String(error));
    }
  }

  downloadButton.addEventListener('click', () => {
    if (currentSnapshot) downloadSnapshot(currentSnapshot);
  });

  $('#runAudit').addEventListener('click', audit);

  // Intentionally no write helpers exist in this file.
  // No indexedDB.put/delete/clear/deleteDatabase calls are permitted here.
  audit();
})();
