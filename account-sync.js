import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/+esm';

const SUPABASE_URL = 'https://zyrbbkbwrijnnykbgjvc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_OW-03s1ExuA2GwmmL7HtRQ_IHOPxyGL';
const AUTH_URL = `${SUPABASE_URL}/functions/v1/hakuna-account-auth`;
const DB_NAME = 'hakuna-matata-db';
const DB_VERSION = 1;
const STORE = 'app';
const STATE_KEY = 'state';
const DEVICE_KEY = 'hakuna.cloud.deviceId';
const OWNER_KEY = 'hakuna.cloud.localOwner';
const PROFILE_CACHE_KEY = 'hakuna.cloud.profile';
const META_PREFIX = 'hakuna.cloud.meta.';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

let session = null;
let user = null;
let profile = null;
let knownRevision = 0;
let lastSyncedHash = '';
let lastObservedHash = '';
let syncBusy = false;
let syncTimer = null;
let uiTimer = null;
let started = false;
let lastLocalChangeAt = 0;

const deviceId = (() => {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = `dev_${crypto.randomUUID?.() || `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`}`;
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
})();

function todayISO() {
  const d = new Date();
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

function emptyState() {
  return { version: 2, selectedDate: todayISO(), blocks: [], tasks: [], debts: [], exams: [], questions: [], settings: { firstRun: false } };
}

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function syncProjection(value) {
  const state = clone(value || emptyState());
  delete state.selectedDate;
  return state;
}

function hydrateCloudState(value) {
  const state = clone(value || emptyState());
  state.selectedDate = todayISO();
  return state;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
    return out;
  }
  return value;
}

async function hashState(value) {
  const text = JSON.stringify(canonicalize(syncProjection(value)));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,'0')).join('');
}

function meaningful(state) {
  return ['blocks','tasks','debts','exams','questions'].some(k => Array.isArray(state?.[k]) && state[k].length > 0);
}

function mergeById(remote = [], local = []) {
  const map = new Map();
  for (const item of remote) if (item?.id != null) map.set(String(item.id), clone(item));
  for (const item of local) if (item?.id != null) map.set(String(item.id), clone(item));
  return [...map.values()];
}

function mergeStates(remote, local) {
  const r = hydrateCloudState(remote);
  const l = clone(local || emptyState());
  const merged = { ...r, ...l };
  for (const key of ['blocks','tasks','debts','exams','questions']) merged[key] = mergeById(r[key], l[key]);
  merged.settings = { ...(r.settings || {}), ...(l.settings || {}) };
  merged.selectedDate = l.selectedDate || todayISO();
  return merged;
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGet(key) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally { db.close(); }
}

async function dbSet(key, value) {
  const db = await openDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally { db.close(); }
}

async function readLocalState() { return (await dbGet(STATE_KEY)) || emptyState(); }
async function writeLocalState(state) { await dbSet(STATE_KEY, clone(state)); }

async function localSafetyBackup(state, reason) {
  const stamp = new Date().toISOString().replace(/[:.]/g,'-');
  await dbSet(`cloud-safety-${reason}-${stamp}`, clone(state));
}

function metaKey(uid) { return `${META_PREFIX}${uid}`; }
function loadMeta(uid) {
  try { return JSON.parse(localStorage.getItem(metaKey(uid)) || '{}'); } catch { return {}; }
}
function saveMeta(uid, patch) {
  const next = { ...loadMeta(uid), ...patch, deviceId, savedAt: new Date().toISOString() };
  localStorage.setItem(metaKey(uid), JSON.stringify(next));
  return next;
}

function setSyncState(text, kind = '') {
  document.documentElement.dataset.hakunaCloudState = kind || 'idle';
  document.documentElement.dataset.hakunaCloudText = text;
  scheduleUI();
}

function toast(text) {
  const root = document.querySelector('#toastRoot');
  if (root) {
    const el = document.createElement('div'); el.className = 'toast'; el.textContent = text; root.append(el); setTimeout(() => el.remove(), 2800); return;
  }
  console.info(text);
}

async function authRequest(mode, payload) {
  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
    body: JSON.stringify({ mode, ...payload })
  });
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(data?.error || 'Hesap işlemi tamamlanamadı.');
  return data;
}

async function setReturnedSession(data) {
  if (!data?.session?.access_token || !data?.session?.refresh_token) throw new Error('Oturum bilgisi alınamadı.');
  const { data: setData, error } = await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token
  });
  if (error) throw error;
  session = setData.session;
  user = setData.user || data.user || null;
  return user;
}

async function loadProfile() {
  if (!user?.id) { profile = null; return null; }
  try {
    const { data, error } = await supabase.from('profiles').select('id,username,created_at').eq('id', user.id).single();
    if (error) throw error;
    profile = data;
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ userId: user.id, username: data.username }));
    return data;
  } catch {
    try {
      const cached = JSON.parse(localStorage.getItem(PROFILE_CACHE_KEY) || '{}');
      if (cached.userId === user.id) profile = { id: user.id, username: cached.username };
    } catch {}
    return profile;
  }
}

async function fetchCloudState() {
  if (!user?.id) return null;
  const { data, error } = await supabase
    .from('app_state')
    .select('state,state_hash,revision,updated_at,last_device_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function createSafetySnapshot(state, source = 'pre_connect') {
  if (!user?.id) return;
  const projected = syncProjection(state);
  const hash = await hashState(projected);
  const { error } = await supabase.from('state_versions').insert({
    user_id: user.id,
    revision: null,
    state: projected,
    state_hash: hash,
    source,
    device_id: deviceId
  });
  if (error) console.warn('Safety snapshot could not be uploaded', error);
}

async function initializeCloud(localState) {
  const projected = syncProjection(localState);
  const hash = await hashState(projected);
  const { data, error } = await supabase.rpc('hakuna_initialize_state', {
    p_state: projected,
    p_hash: hash,
    p_device_id: deviceId
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  knownRevision = Number(row?.revision || 1);
  lastSyncedHash = String(row?.state_hash || hash);
  lastObservedHash = hash;
  saveMeta(user.id, { revision: knownRevision, lastSyncedHash });
  localStorage.setItem(OWNER_KEY, user.id);
  setSyncState('Bulut koruması açık', 'ok');
}

async function writeRevision(state, expectedRevision) {
  const projected = syncProjection(state);
  const hash = await hashState(projected);
  const { data, error } = await supabase.rpc('hakuna_save_state', {
    p_state: projected,
    p_hash: hash,
    p_expected_revision: Number(expectedRevision),
    p_device_id: deviceId
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  knownRevision = Number(row?.revision || Number(expectedRevision) + 1);
  lastSyncedHash = String(row?.state_hash || hash);
  lastObservedHash = hash;
  saveMeta(user.id, { revision: knownRevision, lastSyncedHash });
  setSyncState('Senkronlandı', 'ok');
  return { revision: knownRevision, hash: lastSyncedHash };
}

async function reconcileAccount() {
  if (!user?.id) return;
  syncBusy = true;
  setSyncState('Hesap bağlanıyor…');
  try {
    await loadProfile();
    const owner = localStorage.getItem(OWNER_KEY);
    let local = await readLocalState();
    const cloud = await fetchCloudState();

    if (owner && owner !== user.id) {
      await localSafetyBackup(local, 'account-switch');
      if (cloud) {
        const incoming = hydrateCloudState(cloud.state);
        await writeLocalState(incoming);
        localStorage.setItem(OWNER_KEY, user.id);
        knownRevision = Number(cloud.revision || 1);
        lastSyncedHash = String(cloud.state_hash || await hashState(incoming));
        lastObservedHash = lastSyncedHash;
        saveMeta(user.id, { revision: knownRevision, lastSyncedHash });
        setSyncState('Hesap verileri bu cihaza getirildi', 'ok');
        setTimeout(() => location.reload(), 250);
        return;
      }
      local = emptyState();
      await writeLocalState(local);
      await initializeCloud(local);
      setTimeout(() => location.reload(), 250);
      return;
    }

    if (!cloud) {
      await initializeCloud(local);
      return;
    }

    const localHash = await hashState(local);
    const cloudHash = String(cloud.state_hash || await hashState(cloud.state));
    knownRevision = Number(cloud.revision || 1);

    if (localHash === cloudHash) {
      lastSyncedHash = cloudHash;
      lastObservedHash = localHash;
      localStorage.setItem(OWNER_KEY, user.id);
      saveMeta(user.id, { revision: knownRevision, lastSyncedHash });
      setSyncState('Senkronlandı', 'ok');
      return;
    }

    if (!meaningful(local)) {
      await localSafetyBackup(local, 'before-cloud-pull');
      const incoming = hydrateCloudState(cloud.state);
      await writeLocalState(incoming);
      lastSyncedHash = cloudHash;
      lastObservedHash = cloudHash;
      localStorage.setItem(OWNER_KEY, user.id);
      saveMeta(user.id, { revision: knownRevision, lastSyncedHash });
      setSyncState('Buluttaki veriler getirildi', 'ok');
      setTimeout(() => location.reload(), 250);
      return;
    }

    await localSafetyBackup(local, 'pre-connect');
    await createSafetySnapshot(local, 'pre_connect');
    const merged = mergeStates(cloud.state, local);
    const mergedHash = await hashState(merged);
    if (mergedHash !== localHash) await writeLocalState(merged);
    await writeRevision(merged, knownRevision);
    localStorage.setItem(OWNER_KEY, user.id);
    toast('Yerel ve bulut verileri güvenli şekilde birleştirildi.');
    if (mergedHash !== localHash) setTimeout(() => location.reload(), 300);
  } finally {
    syncBusy = false;
    scheduleUI();
  }
}

async function resolveRevisionConflict(local) {
  const cloud = await fetchCloudState();
  if (!cloud) return initializeCloud(local);
  await localSafetyBackup(local, 'revision-conflict');
  await createSafetySnapshot(local, 'conflict_local');
  const merged = mergeStates(cloud.state, local);
  const beforeHash = await hashState(local);
  await writeRevision(merged, Number(cloud.revision));
  const mergedHash = await hashState(merged);
  if (mergedHash !== beforeHash) {
    await writeLocalState(merged);
    toast('İki cihazdaki değişiklikler birleştirildi.');
    setTimeout(() => location.reload(), 300);
  }
}

async function pushLocalState() {
  if (!user?.id || syncBusy || !navigator.onLine) return;
  syncBusy = true;
  try {
    const local = await readLocalState();
    const hash = await hashState(local);
    lastObservedHash = hash;
    if (hash === lastSyncedHash) return;
    setSyncState('Senkronlanıyor…');
    try {
      await writeRevision(local, knownRevision || Number(loadMeta(user.id).revision || 1));
    } catch (error) {
      if (String(error?.message || error).includes('HAKUNA_REVISION_CONFLICT')) {
        await resolveRevisionConflict(local);
      } else throw error;
    }
  } catch (error) {
    console.warn('Hakuna cloud sync', error);
    setSyncState('Yerelde kayıtlı · bulut bekliyor', 'warn');
  } finally {
    syncBusy = false;
    scheduleUI();
  }
}

function schedulePush() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(pushLocalState, 700);
}

async function observeLocal() {
  if (!user?.id || syncBusy) return;
  try {
    const local = await readLocalState();
    const hash = await hashState(local);
    if (!lastObservedHash) lastObservedHash = hash;
    if (hash !== lastObservedHash) {
      lastObservedHash = hash;
      lastLocalChangeAt = Date.now();
      schedulePush();
    }
  } catch {}
}

async function checkRemote() {
  if (!user?.id || syncBusy || !navigator.onLine || Date.now() - lastLocalChangeAt < 5000) return;
  syncBusy = true;
  try {
    const cloud = await fetchCloudState();
    if (!cloud) return;
    const remoteRevision = Number(cloud.revision || 1);
    if (remoteRevision <= knownRevision) return;
    const local = await readLocalState();
    const localHash = await hashState(local);
    if (localHash === lastSyncedHash) {
      await localSafetyBackup(local, 'before-remote-update');
      const incoming = hydrateCloudState(cloud.state);
      await writeLocalState(incoming);
      knownRevision = remoteRevision;
      lastSyncedHash = String(cloud.state_hash || await hashState(incoming));
      lastObservedHash = lastSyncedHash;
      saveMeta(user.id, { revision: knownRevision, lastSyncedHash });
      setSyncState('Diğer cihazdaki değişiklikler geldi', 'ok');
      setTimeout(() => location.reload(), 250);
    } else {
      await resolveRevisionConflict(local);
    }
  } catch (error) {
    console.warn('Remote check failed', error);
  } finally { syncBusy = false; }
}

function scheduleUI() {
  clearTimeout(uiTimer);
  uiTimer = setTimeout(renderAccountUI, 50);
}

function accountLabel() {
  return profile?.username ? `@${profile.username}` : (user?.email || 'Hakuna hesabı');
}

function injectStyles() {
  if (document.querySelector('#hakunaCloudStyles')) return;
  const style = document.createElement('style');
  style.id = 'hakunaCloudStyles';
  style.textContent = `
    .hakuna-account-home{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 16px;margin:0 0 14px;border:1px solid #dbe5f1;border-radius:16px;background:linear-gradient(135deg,#f7fbff,#eef6ff)}
    .hakuna-account-home strong{display:block;color:#1f3856;font-size:14px}.hakuna-account-home span{display:block;color:#6c7b8d;font-size:12px;margin-top:3px}.hakuna-account-home button,.hakuna-cloud-btn{border:0;border-radius:11px;padding:9px 12px;font-weight:800;cursor:pointer;background:#1f6fd0;color:white;white-space:nowrap}
    .hakuna-cloud-settings{grid-column:1/-1}.hakuna-cloud-status{font-size:11px;color:#758397;margin-top:4px}.hakuna-cloud-account-line{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.hakuna-cloud-dot{width:8px;height:8px;border-radius:50%;background:#34a853}.hakuna-cloud-secondary{background:#eef2f7;color:#34455b;border:1px solid #d8e0ea}.hakuna-cloud-danger{background:#fff1f2;color:#9f1239;border:1px solid #fecdd3}
    .hakuna-cloud-modal-backdrop{position:fixed;inset:0;z-index:10050;background:rgba(8,20,38,.52);display:flex;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(5px)}
    .hakuna-cloud-modal{width:min(430px,100%);background:#fff;color:#1c2a3a;border-radius:22px;padding:22px;box-shadow:0 25px 90px rgba(0,0,0,.28);position:relative}.hakuna-cloud-modal h2{margin:0 0 5px}.hakuna-cloud-modal p{margin:0 0 16px;color:#6d7887;font-size:13px;line-height:1.45}.hakuna-cloud-close{position:absolute;right:14px;top:12px;border:0;background:transparent;font-size:24px;color:#7b8795;cursor:pointer}.hakuna-cloud-tabs{display:flex;background:#f0f3f7;border-radius:12px;padding:3px;margin-bottom:14px}.hakuna-cloud-tabs button{flex:1;border:0;border-radius:9px;padding:9px;background:transparent;font-weight:800;color:#6a7583}.hakuna-cloud-tabs button.active{background:#fff;color:#1d3048;box-shadow:0 1px 5px rgba(0,0,0,.08)}.hakuna-cloud-field{margin:10px 0}.hakuna-cloud-field label{display:block;font-size:12px;font-weight:800;color:#546276;margin-bottom:5px}.hakuna-cloud-field input{width:100%;box-sizing:border-box;border:1px solid #d7dee8;border-radius:12px;padding:12px 13px;font-size:16px;background:#fff;color:#132238}.hakuna-cloud-submit{width:100%;border:0;border-radius:12px;padding:12px;margin-top:8px;background:#1f6fd0;color:#fff;font-weight:850;cursor:pointer}.hakuna-cloud-submit:disabled{opacity:.55}.hakuna-cloud-error{min-height:18px;margin-top:10px;color:#b42318;font-size:12px}.hakuna-cloud-note{font-size:11px!important;margin-top:12px!important}.hakuna-cloud-hidden{display:none!important}
    @media(max-width:620px){.hakuna-account-home{align-items:flex-start;flex-direction:column}.hakuna-account-home button{width:100%}}
  `;
  document.head.append(style);
}

function removeInjected() {
  document.querySelectorAll('.hakuna-account-home,.hakuna-cloud-settings').forEach(el => el.remove());
}

function renderAccountUI() {
  injectStyles();
  removeInjected();
  const title = document.querySelector('#pageTitle')?.textContent?.trim();
  const view = document.querySelector('#view');
  if (!view) return;

  if (title === 'Bugün' && !user) {
    const grid = view.querySelector('.dashboard-grid');
    if (grid) {
      const card = document.createElement('div');
      card.className = 'hakuna-account-home';
      card.innerHTML = `<div><strong>☁️ Verilerini koru</strong><span>Ücretsiz Hakuna hesabı aç; denemelerin ve programın cihazlar arasında senkronlansın.</span></div><button type="button">Hesap aç / giriş yap</button>`;
      card.querySelector('button').onclick = () => openAccountModal('register');
      grid.before(card);
    }
  }

  if (title === 'Ayarlar') {
    const grid = view.querySelector('.settings-grid') || view;
    const card = document.createElement('section');
    card.className = 'card settings-section hakuna-cloud-settings';
    if (!user) {
      card.innerHTML = `<div class="card-title">☁️ Hakuna hesabı</div><div class="settings-row"><div><div class="settings-row-title">Hesap bağla</div><div class="settings-row-desc">İsteğe bağlıdır. Hesap açınca mevcut verilerin korunur ve aynı hesapla diğer cihazlarında görünür.</div></div><button class="hakuna-cloud-btn" type="button">Hesap bağla</button></div>`;
      card.querySelector('button').onclick = () => openAccountModal('login');
    } else {
      const syncText = document.documentElement.dataset.hakunaCloudText || 'Bulut koruması açık';
      card.innerHTML = `<div class="card-title">☁️ Hakuna hesabı</div><div class="settings-row"><div><div class="hakuna-cloud-account-line"><span class="hakuna-cloud-dot"></span><strong>${escapeHtml(accountLabel())}</strong></div><div class="settings-row-desc">${escapeHtml(user.email || '')}</div><div class="hakuna-cloud-status">${escapeHtml(syncText)}</div></div><div style="display:flex;gap:7px;flex-wrap:wrap"><button class="hakuna-cloud-btn hakuna-cloud-secondary" data-cloud-sync type="button">Şimdi senkronla</button><button class="hakuna-cloud-btn hakuna-cloud-danger" data-cloud-logout type="button">Çıkış yap</button></div></div>`;
      card.querySelector('[data-cloud-sync]').onclick = () => { schedulePush(); checkRemote(); toast('Senkron kontrolü başlatıldı.'); };
      card.querySelector('[data-cloud-logout]').onclick = logout;
    }
    grid.prepend(card);
  }
}

function escapeHtml(v='') { return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function openAccountModal(mode = 'login') {
  document.querySelector('.hakuna-cloud-modal-backdrop')?.remove();
  const root = document.createElement('div');
  root.className = 'hakuna-cloud-modal-backdrop';
  root.innerHTML = `<div class="hakuna-cloud-modal" role="dialog" aria-modal="true"><button class="hakuna-cloud-close" aria-label="Kapat">×</button><h2>Hakuna hesabı</h2><p>Hesap zorunlu değil. Bağlarsan verilerin bulutta korunur ve diğer cihazlarınla senkronlanır.</p><div class="hakuna-cloud-tabs"><button data-tab="login">Giriş yap</button><button data-tab="register">Hesap oluştur</button></div><form data-form="login"><div class="hakuna-cloud-field"><label>Kullanıcı adı veya e-posta</label><input name="identifier" autocomplete="username" required></div><div class="hakuna-cloud-field"><label>Şifre</label><input name="password" type="password" autocomplete="current-password" required></div><button class="hakuna-cloud-submit">Giriş yap</button></form><form data-form="register"><div class="hakuna-cloud-field"><label>Kullanıcı adı</label><input name="username" autocomplete="username" minlength="3" maxlength="32" required></div><div class="hakuna-cloud-field"><label>E-posta</label><input name="email" type="email" autocomplete="email" required></div><div class="hakuna-cloud-field"><label>Şifre</label><input name="password" type="password" autocomplete="new-password" minlength="8" required></div><button class="hakuna-cloud-submit">Hesap oluştur ve verilerimi koru</button></form><div class="hakuna-cloud-error"></div><p class="hakuna-cloud-note">İlk bağlantıda bu cihazdaki mevcut program, denemeler, borçlar ve sorular hesabına bağlanır. Yerel kopya da cihazda kalır.</p></div>`;
  document.body.append(root);
  const setTab = next => {
    root.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === next));
    root.querySelectorAll('[data-form]').forEach(f => f.classList.toggle('hakuna-cloud-hidden', f.dataset.form !== next));
  };
  setTab(mode);
  root.querySelector('.hakuna-cloud-close').onclick = () => root.remove();
  root.addEventListener('click', e => { if (e.target === root) root.remove(); });
  root.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => setTab(b.dataset.tab));
  root.querySelector('[data-form="login"]').onsubmit = async e => {
    e.preventDefault();
    const form = e.currentTarget, btn = form.querySelector('button'), err = root.querySelector('.hakuna-cloud-error');
    btn.disabled = true; err.textContent = '';
    try {
      const fd = new FormData(form);
      const data = await authRequest('login', { identifier: fd.get('identifier'), password: fd.get('password') });
      await setReturnedSession(data);
      await reconcileAccount();
      root.remove();
      toast('Hakuna hesabına giriş yapıldı ✓');
      scheduleUI();
    } catch (error) { err.textContent = error?.message || String(error); }
    finally { btn.disabled = false; }
  };
  root.querySelector('[data-form="register"]').onsubmit = async e => {
    e.preventDefault();
    const form = e.currentTarget, btn = form.querySelector('button'), err = root.querySelector('.hakuna-cloud-error');
    btn.disabled = true; err.textContent = '';
    try {
      const fd = new FormData(form);
      const data = await authRequest('register', { username: fd.get('username'), email: fd.get('email'), password: fd.get('password') });
      await setReturnedSession(data);
      await reconcileAccount();
      root.remove();
      toast('Hesap oluşturuldu. Mevcut verilerin korunuyor ✓');
      scheduleUI();
    } catch (error) { err.textContent = error?.message || String(error); }
    finally { btn.disabled = false; }
  };
}

async function logout() {
  try { await pushLocalState(); } catch {}
  await supabase.auth.signOut();
  session = null; user = null; profile = null; knownRevision = 0; lastSyncedHash = ''; lastObservedHash = '';
  setSyncState('Yerel kullanım');
  toast('Hesaptan çıkıldı. Cihazdaki veriler silinmedi.');
  scheduleUI();
}

async function bootstrap() {
  if (started) return;
  started = true;
  injectStyles();
  const { data } = await supabase.auth.getSession();
  session = data.session || null;
  user = session?.user || null;
  if (user?.id) {
    const meta = loadMeta(user.id);
    knownRevision = Number(meta.revision || 0);
    lastSyncedHash = String(meta.lastSyncedHash || '');
    await reconcileAccount().catch(error => { console.warn(error); setSyncState('Yerelde kayıtlı · bulut bekliyor','warn'); });
  } else setSyncState('Yerel kullanım');
  scheduleUI();
}

supabase.auth.onAuthStateChange((_event, nextSession) => {
  session = nextSession;
  const nextUser = nextSession?.user || null;
  if (nextUser?.id !== user?.id) {
    user = nextUser;
    if (user?.id) reconcileAccount().catch(console.warn);
    else { profile = null; knownRevision = 0; lastSyncedHash = ''; lastObservedHash = ''; }
  } else user = nextUser;
  scheduleUI();
});

const observer = new MutationObserver(() => scheduleUI());
const view = document.querySelector('#view');
if (view) observer.observe(view, { childList: true, subtree: true });
window.addEventListener('online', () => { schedulePush(); checkRemote(); });
window.addEventListener('focus', () => checkRemote());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkRemote(); });
setInterval(observeLocal, 1800);
setInterval(checkRemote, 45000);

bootstrap().catch(error => console.warn('Hakuna account bootstrap failed', error));
