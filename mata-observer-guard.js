(() => {
  'use strict';
  const NativeMutationObserver = window.MutationObserver;
  if (!NativeMutationObserver) return;

  window.MutationObserver = class MataSafeMutationObserver extends NativeMutationObserver {
    observe(target, options) {
      // Mata v1, tüm body ağacını izlediğinde kendi ekranını her çizdiğinde tekrar
      // çiziyordu. iPad'de textarea sürekli DOM'dan kaldırıldığı için klavye
      // açılamıyordu. Body izleme isteğini yalnızca navigasyonlara daraltıyoruz.
      if (target === document.body && options && options.childList && options.subtree) {
        const sidebar = document.querySelector('#sidebarNav');
        const bottom = document.querySelector('#bottomNav');
        const navOptions = { childList: true };
        if (sidebar) super.observe(sidebar, navOptions);
        if (bottom) super.observe(bottom, navOptions);
        return;
      }
      return super.observe(target, options);
    }
  };
})();
