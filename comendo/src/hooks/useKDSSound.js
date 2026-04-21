// src/hooks/useKDSSound.js
// Hook que genera alertas sonoras en el KDS usando Web Audio API
// RF-2.4 — Alertas Sensoriales KDS

const useKDSSound = () => {

  // ── Genera un sonido de alerta para nuevo pedido ──────────────────────
  const sonarNuevoPedido = () => {
    try {
      const contexto = new (window.AudioContext || window.webkitAudioContext)();

      // Secuencia de 3 beeps ascendentes
      const tiempos = [0, 0.2, 0.4];
      const frecuencias = [440, 550, 660];

      tiempos.forEach((tiempo, i) => {
        const oscilador = contexto.createOscillator();
        const ganancia = contexto.createGain();

        oscilador.connect(ganancia);
        ganancia.connect(contexto.destination);

        oscilador.type = 'sine';
        oscilador.frequency.setValueAtTime(frecuencias[i], contexto.currentTime + tiempo);

        // Fade in y fade out suave
        ganancia.gain.setValueAtTime(0, contexto.currentTime + tiempo);
        ganancia.gain.linearRampToValueAtTime(0.4, contexto.currentTime + tiempo + 0.05);
        ganancia.gain.linearRampToValueAtTime(0, contexto.currentTime + tiempo + 0.15);

        oscilador.start(contexto.currentTime + tiempo);
        oscilador.stop(contexto.currentTime + tiempo + 0.2);
      });
    } catch (err) {
      console.warn('Web Audio API no disponible:', err);
    }
  };

  // ── Sonido de alerta para pedido con tiempo excesivo ─────────────────
  const sonarAlertaUrgente = () => {
    try {
      const contexto = new (window.AudioContext || window.webkitAudioContext)();

      // Beep largo y grave — señal de urgencia
      const oscilador = contexto.createOscillator();
      const ganancia = contexto.createGain();

      oscilador.connect(ganancia);
      ganancia.connect(contexto.destination);

      oscilador.type = 'square';
      oscilador.frequency.setValueAtTime(300, contexto.currentTime);

      ganancia.gain.setValueAtTime(0.3, contexto.currentTime);
      ganancia.gain.linearRampToValueAtTime(0, contexto.currentTime + 0.5);

      oscilador.start(contexto.currentTime);
      oscilador.stop(contexto.currentTime + 0.5);
    } catch (err) {
      console.warn('Web Audio API no disponible:', err);
    }
  };

  return { sonarNuevoPedido, sonarAlertaUrgente };
};

export default useKDSSound;