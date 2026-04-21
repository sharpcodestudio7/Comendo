// src/registerSW.js
// Registra el Service Worker para habilitar funcionalidades PWA

export const registerSW = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[SW] Registrado correctamente:', registration.scope);
        })
        .catch((error) => {
          console.error('[SW] Error al registrar:', error);
        });
    });
  }
};