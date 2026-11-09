/* 10 November 2026 tribute: shown in the Rooms lobby, never inside an opened study room. */
(() => {
  'use strict';
  const DAY = {year: 2026, month: 11, day: 10};
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const photos = [
    'https://commons.wikimedia.org/wiki/Special:FilePath/Ataturk1930s.jpg?width=940',
    'https://commons.wikimedia.org/wiki/Special:FilePath/Atat%C3%BCrk_portre.png?width=940'
  ];
  let tribute = null;
  let observer = null;

  function isActiveAt(date) {
    const parts = {};
    for (const item of formatter.formatToParts(date)) {
      if (item.type !== 'literal') parts[item.type] = Number(item.value);
    }
    return parts.year === DAY.year && parts.month === DAY.month && parts.day === DAY.day;
  }

  function makeTribute() {
    const node = document.createElement('section');
    node.className = 'tk10-tribute';
    node.setAttribute('aria-label', '10 Kasım 2026, Gazi Mustafa Kemal Atatürk anması');
    node.innerHTML = [
      '<div class="tk10-film" aria-hidden="true"></div>',
      '<div class="tk10-image-stage" aria-hidden="true">',
        '<div class="tk10-image-aura"></div>',
        '<img class="tk10-photo" alt="" decoding="async" referrerpolicy="no-referrer">',
        '<div class="tk10-image-fade"></div>',
        '<div class="tk10-portrait-year">1881 <span>—</span> 1938</div>',
      '</div>',
      '<div class="tk10-body">',
        '<div class="tk10-eyebrow"><span class="tk10-thread" aria-hidden="true"></span>',
          '<span>10 KASIM 2026</span><span class="tk10-dot" aria-hidden="true"></span>',
          '<span>ANMA GÜNÜ</span></div>',
        '<div class="tk10-time" aria-label="Saat dokuzu beş geçe">09<span>:</span>05</div>',
        '<div class="tk10-overline">GAZİ MUSTAFA KEMAL</div>',
        '<h2 class="tk10-title">ATATÜRK<span class="tk10-title-rule" aria-hidden="true"></span></h2>',
        '<p class="tk10-statement">Bir ömür. <em>Sonsuz iz.</em></p>',
        '<p class="tk10-message">Fikirleriyle yolumuzu aydınlatan Gazi Mustafa Kemal Paşa’yı,',
          ' aramızdan ayrılışının 88. yılında saygı, özlem ve minnetle anıyoruz.</p>',
        '<div class="tk10-baseline"><span class="tk10-redmark" aria-hidden="true"></span>',
          '<span>SAYGIYLA, ÖZLEMLE, MİNNETLE</span><span class="tk10-baseline-stroke" aria-hidden="true"></span></div>',
      '</div>',
      '<a class="tk10-photo-credit" href="https://commons.wikimedia.org/wiki/File:Ataturk1930s.jpg"',
        ' target="_blank" rel="noopener noreferrer" aria-label="Atatürk fotoğrafı kaynağı: Wikimedia Commons">',
        'Fotoğraf: Wikimedia Commons</a>'
    ].join('');

    const img = node.querySelector('.tk10-photo');
    let index = 0;
    img.addEventListener('load', () => {
      if (img.naturalWidth > 0) node.classList.add('tk10-photo-ready');
    });
    img.addEventListener('error', () => {
      index += 1;
      if (index < photos.length) {
        img.src = photos[index];
      } else {
        node.classList.add('tk10-photo-unavailable');
        img.removeAttribute('src');
      }
    });
    img.src = photos[0];
    return node;
  }

  function refresh() {
    const view = document.getElementById('view');
    const title = document.getElementById('pageTitle')?.textContent?.trim();
    // The Rooms *tab/lobby* gets the tribute. Only an opened study room is isolated.
    // Checking the actual room markup as well protects transitions before sr-immersed toggles.
    const insideOpenedRoom = document.body.classList.contains('sr-immersed') ||
      Boolean(view?.querySelector?.('.sr-room'));
    const visible = Boolean(view && title && !insideOpenedRoom && isActiveAt(new Date()));
    if (!visible) {
      if (tribute) tribute.remove();
      tribute = null;
      if (document.body.classList.contains('tk10-active')) document.body.classList.remove('tk10-active');
      return;
    }

    if (!tribute || !tribute.isConnected) {
      tribute = makeTribute();
      view.before(tribute);
    }
    const home = title === 'Bugün';
    tribute.classList.toggle('tk10-home', home);
    tribute.classList.toggle('tk10-compact', !home);
    if (!document.body.classList.contains('tk10-active')) document.body.classList.add('tk10-active');
  }

  function boot() {
    refresh();
    const title = document.getElementById('pageTitle');
    if (title && !observer) {
      observer = new MutationObserver(refresh);
      observer.observe(title, {childList: true, characterData: true, subtree: true});
      // Page title stays 'Odalar' when entering/leaving a study room, so watch
      // immersion on the body as well, without observing any room internals.
      observer.observe(document.body, {attributes: true, attributeFilter: ['class']});
    }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
    window.addEventListener('pageshow', refresh);
    window.addEventListener('focus', refresh);
    // 11 November in Istanbul removes the tribute even if the app stays open.
    window.setInterval(refresh, 30000);
  }

  window.HakunaTenKasim2026 = Object.freeze({isActiveAt, refresh});
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, {once: true});
  } else {
    boot();
  }
})();
