// src/components/admin/MesasQR.jsx
// Genera y muestra los códigos QR para cada mesa del restaurante

import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../api/supabase';

const MesasQR = () => {
  const [mesas, setMesas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    // Detecta la URL base automáticamente
    setBaseUrl(window.location.origin);
    cargarMesas();
  }, []);

  const cargarMesas = async () => {
    setCargando(true);
    const { data } = await supabase
      .from('mesas')
      .select('*')
      .order('numero');
    setMesas(data || []);
    setCargando(false);
  };

  // ── Descargar QR como imagen PNG ──────────────────────────────────────
  const descargarQR = (mesaNumero, mesaId) => {
    const svg = document.getElementById(`qr-mesa-${mesaId}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 340;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.onload = () => {
      // Fondo blanco
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 300, 340);

      // QR centrado
      ctx.drawImage(img, 25, 20, 250, 250);

      // Texto de la mesa
      ctx.fillStyle = '#1a1a2e';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`Mesa ${mesaNumero}`, 150, 300);

      ctx.font = '12px Arial';
      ctx.fillStyle = '#666';
      ctx.fillText('Escanea para ver el menú', 150, 325);

      // Descarga
      const link = document.createElement('a');
      link.download = `QR_Mesa_${mesaNumero}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  // ── Descargar todos los QR en un ZIP ──────────────────────────────────
  const descargarTodos = () => {
    mesas.forEach((mesa, index) => {
      setTimeout(() => {
        descargarQR(mesa.numero, mesa.id_mesa);
      }, index * 500); // Descarga con delay para no saturar el navegador
    });
  };

  if (cargando) return <p style={{ color: '#fff' }}>Cargando mesas...</p>;

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.titulo}>📱 Códigos QR por Mesa</h2>
        <button style={styles.btnDescargarTodos} onClick={descargarTodos}>
          ⬇ Descargar Todos
        </button>
      </div>

      <p style={styles.descripcion}>
        Imprime y coloca cada QR en su mesa correspondiente. El comensal lo escanea
        para acceder al menú directamente desde su celular.
      </p>

      {/* Grid de QRs */}
      <div style={styles.grid}>
        {mesas.map((mesa) => {
          const urlMesa = `${baseUrl}/mesa/${mesa.id_mesa}`;
          return (
            <div key={mesa.id_mesa} style={styles.card}>

              {/* Estado de la mesa */}
              <div style={{
                ...styles.estadoBadge,
                backgroundColor: mesa.estado === 'Libre' ? '#2D6A4F' : '#E53935',
              }}>
                {mesa.estado === 'Libre' ? '🟢 Libre' : '🔴 Ocupada'}
              </div>

              {/* Número de mesa */}
              <h3 style={styles.mesaNumero}>Mesa {mesa.numero}</h3>

              {/* QR Code */}
              <div style={styles.qrContainer}>
                <QRCodeSVG
                  id={`qr-mesa-${mesa.id_mesa}`}
                  value={urlMesa}
                  size={180}
                  bgColor="#ffffff"
                  fgColor="#1a1a2e"
                  level="H"
                  includeMargin={true}
                />
              </div>

              {/* URL de la mesa */}
              <p style={styles.urlTexto}>
                {urlMesa.replace(baseUrl, '...')}
              </p>

              {/* Botón descargar */}
              <button
                style={styles.btnDescargar}
                onClick={() => descargarQR(mesa.numero, mesa.id_mesa)}
              >
                ⬇ Descargar QR
              </button>

            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  titulo: { margin: 0, color: '#fff', fontSize: '22px' },
  btnDescargarTodos: { padding: '10px 20px', backgroundColor: '#1565C0', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '15px' },
  descripcion: { color: '#888', fontSize: '14px', marginBottom: '24px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' },
  card: { backgroundColor: '#16213e', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' },
  estadoBadge: { padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', color: '#fff' },
  mesaNumero: { margin: 0, color: '#fff', fontSize: '20px', fontWeight: '700' },
  qrContainer: { backgroundColor: '#fff', borderRadius: '8px', padding: '8px' },
  urlTexto: { margin: 0, color: '#555', fontSize: '11px', textAlign: 'center', wordBreak: 'break-all' },
  btnDescargar: { width: '100%', padding: '10px', backgroundColor: '#2D6A4F', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' },
};

export default MesasQR;