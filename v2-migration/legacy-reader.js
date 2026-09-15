// Hakuna Matata V2 legacy migration reader.
// Legacy IndexedDB is opened only for readonly transactions.

const LEGACY_DB = 'hakuna-matata-db';
const LEGACY_STORE = 'app';
const LEGACY_KEY = 'state';

function openLegacyDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(LEGACY_DB);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Legacy IndexedDB açılamadı.'));
    request.onupgradeneeded = () => {
      request.transaction?.abort();
      reject(new Error('Legacy DB bulunamadı. Audit yeni bir DB oluşturmadı.'));
    };
  });
}

export async function readLegacyState() {
  const db = await openLegacyDb();
  try {
    if (!db.objectStoreNames.contains(LEGACY_STORE)) {
      throw new Error(`Legacy store bulunamadı: ${LEGACY_STORE}`);
    }
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(LEGACY_STORE, 'readonly');
      const req = tx.objectStore(LEGACY_STORE).get(LEGACY_KEY);
      req.onsuccess = () => {
        if (req.result == null) reject(new Error('Legacy state bulunamadı.'));
        else resolve(structuredClone(req.result));
      };
      req.onerror = () => reject(req.error || new Error('Legacy state okunamadı.'));
    });
  } finally {
    db.close();
  }
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    const result = {};
    for (const key of Object.keys(value).sort()) result[key] = canonicalize(value[key]);
    return result;
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export async function sha256Hex(value) {
  const text = typeof value === 'string' ? value : canonicalJson(value);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function countLegacyCollections(state) {
  const count = key => Array.isArray(state?.[key]) ? state[key].length : 0;
  return {
    blocks: count('blocks'),
    tasks: count('tasks'),
    debts: count('debts'),
    exams: count('exams'),
    questions: count('questions')
  };
}

export async function buildLegacySnapshot() {
  const state = await readLegacyState();
  const hash = await sha256Hex(canonicalJson(state));
  return {
    schema: 'hakuna.legacy.snapshot.v1',
    source: { db: LEGACY_DB, store: LEGACY_STORE, key: LEGACY_KEY },
    capturedAt: new Date().toISOString(),
    hashAlgorithm: 'SHA-256',
    hash,
    counts: countLegacyCollections(state),
    state
  };
}

export async function verifySnapshotIntegrity(snapshot) {
  if (!snapshot?.state || !snapshot?.hash) return { ok: false, reason: 'Eksik snapshot.' };
  const actual = await sha256Hex(canonicalJson(snapshot.state));
  return {
    ok: actual === snapshot.hash,
    expected: snapshot.hash,
    actual,
    counts: countLegacyCollections(snapshot.state)
  };
}

export function downloadSnapshot(snapshot) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Hakuna-PreMigration-${stamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
