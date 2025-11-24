if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(reg => reg.unregister());
  });
}

if ('caches' in window) {
  caches.keys().then(keys => {
    keys.forEach(key => caches.delete(key));
  });
}
