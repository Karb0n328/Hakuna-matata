// Loads Mata v2 in dependency order. The old mata.js is kept in the repo only as a fallback reference.
(() => {
  const load = (src) => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });

  (async () => {
    try {
      await load('./mata-observer-guard.js');
    } catch (err) {
      console.warn('Mata observer guard yüklenemedi.', err);
    }

    await load('./mata-core-v2.js');
    await load('./mata-nlu-v2.js');
    await load('./mata-insights-v1.js?v=1');
    await load('./mata-ui-v2.js');
  })().catch(err => {
    console.error('Mata v2 yüklenemedi.', err);
  });
})();
