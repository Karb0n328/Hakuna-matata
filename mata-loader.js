// Loads Mata in dependency order. v3 adds a lightweight local "brain" on top of the proven v2 engine.
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
      await load('./mata-observer-guard.js?v=3');
    } catch (err) {
      console.warn('Mata observer guard yüklenemedi.', err);
    }

    await load('./mata-core-v2.js?v=3');
    await load('./mata-nlu-v2.js?v=3');
    await load('./mata-insights-v1.js?v=2');
    await load('./mata-brain-v3.js?v=2');
    await load('./mata-ui-v2.js?v=3');
  })().catch(err => {
    console.error('Mata yüklenemedi.', err);
  });
})();
