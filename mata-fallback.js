document.addEventListener('error', event => {
  const el = event.target;
  if (el && el.tagName === 'IMG' && /assets\/mata\.webp$/.test(el.getAttribute('src') || '')) {
    el.src = './assets/mata.svg';
  }
}, true);
