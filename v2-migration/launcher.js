(() => {
  'use strict';

  const CARD_ATTR = 'data-v2-migration-launcher';

  function injectLauncher() {
    const title = document.querySelector('#pageTitle')?.textContent?.trim();
    if (title !== 'Ayarlar') return;

    const view = document.querySelector('#view');
    const grid = view?.querySelector('.settings-grid');
    if (!grid || grid.querySelector(`[${CARD_ATTR}]`)) return;

    const section = document.createElement('section');
    section.className = 'card settings-section';
    section.setAttribute(CARD_ATTR, '');
    section.innerHTML = `
      <div class="card-title">☁️ Hakuna V2 — Güvenli Geçiş</div>
      <div class="settings-row">
        <div>
          <div class="settings-row-title">Bulut yedeği ve hesap sistemine geç</div>
          <div class="settings-row-desc">Önce mevcut verinin tam snapshot'ı alınır. Denemeler dahil her şey doğrulanmadan eski veri değiştirilmez veya silinmez.</div>
        </div>
        <button class="primary-btn" type="button" data-open-v2-migration>Geçişi aç</button>
      </div>
    `;

    grid.prepend(section);
    section.querySelector('[data-open-v2-migration]')?.addEventListener('click', () => {
      window.location.assign('./migration-v2.html');
    });
  }

  const observer = new MutationObserver(injectLauncher);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('click', () => queueMicrotask(injectLauncher), true);
  injectLauncher();
})();
