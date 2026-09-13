// Loads the Mata observer guard before the assistant itself.
(() => {
  const load = (src) => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  load('./mata-observer-guard.js').then(() => load('./mata.js')).catch(() => load('./mata.js'));
})();
