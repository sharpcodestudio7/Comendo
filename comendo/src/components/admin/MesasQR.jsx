import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { supabase } from '../../api/supabase';
import ModalConfirm from '../ModalConfirm';

const MesasQR = () => {
  const [mesas, setMesas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [baseUrl, setBaseUrl] = useState('');
  const [verInactivas, setVerInactivas] = useState(false);
  const [modalCrear, setModalCrear] = useState(false);
  const [numeroNuevo, setNumeroNuevo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');
  const [modalEliminar, setModalEliminar] = useState(null);
  const [descargandoTodos, setDescargandoTodos] = useState(false);

  useEffect(() => {
    setBaseUrl(window.location.origin);
    cargarMesas();
  }, [verInactivas]);

  const cargarMesas = async () => {
    setCargando(true);
    const { data } = await supabase
      .from('mesas')
      .select('*')
      .eq('status_', verInactivas ? 0 : 1)
      .order('numero');
    setMesas(data || []);
    setCargando(false);
  };

  // ── Crear mesa ────────────────────────────────────────────────────────
  const crearMesa = async () => {
    const num = parseInt(numeroNuevo);
    if (!num || num <= 0) { setErrorForm('Ingresa un número de mesa válido.'); return; }

    const duplicada = mesas.find((m) => m.numero === num);
    if (duplicada) { setErrorForm(`Ya existe la Mesa ${num}.`); return; }

    setGuardando(true);
    const { error } = await supabase
      .from('mesas')
      .insert({ numero: num, estado: 'Libre', status_: 1 });

    if (error) { setErrorForm('Error al crear la mesa.'); setGuardando(false); return; }

    setModalCrear(false);
    setNumeroNuevo('');
    setErrorForm('');
    setGuardando(false);
    await cargarMesas();
  };

  // ── Soft delete ───────────────────────────────────────────────────────
  const eliminarMesa = async (mesa) => {
    await supabase.from('mesas').update({ status_: 0 }).eq('id_mesa', mesa.id_mesa);
    setModalEliminar(null);
    await cargarMesas();
  };

  // ── Reactivar ─────────────────────────────────────────────────────────
  const reactivarMesa = async (mesaId) => {
    await supabase.from('mesas').update({ status_: 1 }).eq('id_mesa', mesaId);
    await cargarMesas();
  };

  // ── Descargar QR individual ───────────────────────────────────────────
  const descargarQR = (mesaNumero, mesaId) => {
    return new Promise((resolve) => {
      const svg = document.getElementById(`qr-mesa-${mesaId}`);
      if (!svg) { resolve(); return; }

      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 340;
      const ctx = canvas.getContext('2d');

      const img = new Image();
      img.onload = () => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 300, 340);
        ctx.drawImage(img, 25, 20, 250, 250);
        ctx.fillStyle = '#1a1a2e';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Mesa ${mesaNumero}`, 150, 300);
        ctx.font = '12px Arial';
        ctx.fillStyle = '#666';
        ctx.fillText('Escanea para ver el menú', 150, 325);

        const link = document.createElement('a');
        link.download = `QR_Mesa_${mesaNumero}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        resolve();
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    });
  };

  // ── Generar PNG como Blob (para ZIP) ──────────────────────────────────
  const generarBlob = (mesaNumero, mesaId) => {
    return new Promise((resolve) => {
      const svg = document.getElementById(`qr-mesa-${mesaId}`);
      if (!svg) { resolve(null); return; }

      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 340;
      const ctx = canvas.getContext('2d');

      const img = new Image();
      img.onload = () => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 300, 340);
        ctx.drawImage(img, 25, 20, 250, 250);
        ctx.fillStyle = '#1a1a2e';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Mesa ${mesaNumero}`, 150, 300);
        ctx.font = '12px Arial';
        ctx.fillStyle = '#666';
        ctx.fillText('Escanea para ver el menú', 150, 325);
        canvas.toBlob((blob) => resolve(blob), 'image/png');
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    });
  };

  // ── Descargar todos en ZIP ────────────────────────────────────────────
  const descargarTodos = async () => {
    setDescargandoTodos(true);
    const zip = new JSZip();

    for (const mesa of mesas) {
      const blob = await generarBlob(mesa.numero, mesa.id_mesa);
      if (blob) zip.file(`QR_Mesa_${mesa.numero}.png`, blob);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, 'QR_Mesas_MrArrozPaisa.zip');
    setDescargandoTodos(false);
  };

  if (cargando) return <p style={{ color: '#fff' }}>Cargando mesas...</p>;

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.titulo}>📱 Códigos QR por Mesa</h2>
        <div style={styles.headerAcciones}>
          <button style={styles.btnCrear} onClick={() => { setModalCrear(true); setNumeroNuevo(''); setErrorForm(''); }}>
            + Nueva Mesa
          </button>
          {!verInactivas && (
            <button style={styles.btnDescargarTodos} onClick={descargarTodos} disabled={descargandoTodos}>
              {descargandoTodos ? '⏳ Generando ZIP...' : '⬇ Descargar Todos'}
            </button>
          )}
          <button
            style={verInactivas ? styles.btnInactivasActivo : styles.btnInactivas}
            onClick={() => setVerInactivas((v) => !v)}
          >
            {verInactivas ? '👁 Ver Activas' : '🗂 Ver Inactivas'}
          </button>
        </div>
      </div>

      <p style={styles.descripcion}>
        {verInactivas
          ? 'Mesas desactivadas. Puedes reactivarlas para que vuelvan a aparecer en el sistema.'
          : 'Imprime y coloca cada QR en su mesa correspondiente. El comensal lo escanea para acceder al menú.'}
      </p>

      {/* Grid de QRs */}
      {mesas.length === 0 ? (
        <p style={styles.sinResultados}>
          {verInactivas ? 'No hay mesas inactivas.' : 'No hay mesas activas. Crea una nueva.'}
        </p>
      ) : (
        <div style={styles.grid}>
          {mesas.map((mesa) => {
            const urlMesa = `${baseUrl}/mesa/${mesa.id_mesa}`;
            return (
              <div key={mesa.id_mesa} style={styles.card}>

                <div style={{
                  ...styles.estadoBadge,
                  backgroundColor: verInactivas ? '#555' : (mesa.estado === 'Libre' ? '#2D6A4F' : '#E53935'),
                }}>
                  {verInactivas ? '⚫ Inactiva' : (mesa.estado === 'Libre' ? '🟢 Libre' : '🔴 Ocupada')}
                </div>

                <h3 style={styles.mesaNumero}>Mesa {mesa.numero}</h3>

                {!verInactivas && (
                  <>
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
                    <p style={styles.urlTexto}>{urlMesa.replace(baseUrl, '...')}</p>
                    <button style={styles.btnDescargar} onClick={() => descargarQR(mesa.numero, mesa.id_mesa)}>
                      ⬇ Descargar QR
                    </button>
                  </>
                )}

                {verInactivas ? (
                  <button style={styles.btnReactivar} onClick={() => reactivarMesa(mesa.id_mesa)}>
                    ♻ Reactivar Mesa
                  </button>
                ) : (
                  <button style={styles.btnEliminar} onClick={() => setModalEliminar(mesa)}>
                    🗑 Eliminar Mesa
                  </button>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* Modal crear mesa */}
      {modalCrear && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitulo}>Nueva Mesa</h3>
            <label style={styles.label}>Número de mesa</label>
            <input
              type="number"
              min="1"
              value={numeroNuevo}
              onChange={(e) => { setNumeroNuevo(e.target.value); setErrorForm(''); }}
              placeholder="Ej: 5"
              style={styles.input}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && crearMesa()}
            />
            {errorForm && <p style={styles.errorTexto}>{errorForm}</p>}
            <div style={styles.modalBotones}>
              <button style={styles.btnCancelar} onClick={() => setModalCrear(false)} disabled={guardando}>
                Cancelar
              </button>
              <button style={styles.btnGuardar} onClick={crearMesa} disabled={guardando}>
                {guardando ? 'Creando...' : 'Crear Mesa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminar */}
      {modalEliminar && (
        <ModalConfirm
          titulo="¿Eliminar mesa?"
          mensaje={`La Mesa ${modalEliminar.numero} quedará inactiva. Podrás reactivarla desde "Ver Inactivas".`}
          onConfirmar={() => eliminarMesa(modalEliminar)}
          onCancelar={() => setModalEliminar(null)}
        />
      )}
    </div>
  );
};

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' },
  titulo: { margin: 0, color: '#FFFFFF', fontSize: '20px', fontWeight: '700' },
  headerAcciones: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' },
  btnCrear: { padding: '10px 18px', backgroundColor: '#B87333', color: '#000', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' },
  btnDescargarTodos: { padding: '10px 18px', backgroundColor: 'transparent', color: '#B87333', border: '1px solid #B87333', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' },
  btnInactivas: { padding: '10px 18px', backgroundColor: 'transparent', color: '#888', border: '1px solid #444', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
  btnInactivasActivo: { padding: '10px 18px', backgroundColor: 'rgba(184,115,51,0.15)', color: '#B87333', border: '1px solid #B87333', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
  descripcion: { color: '#999999', fontSize: '14px', marginBottom: '24px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' },
  card: { backgroundColor: '#1A1A1A', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', border: '1px solid #333' },
  estadoBadge: { padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', color: '#fff' },
  mesaNumero: { margin: 0, color: '#FFFFFF', fontSize: '18px', fontWeight: '700' },
  qrContainer: { backgroundColor: '#ffffff', borderRadius: '8px', padding: '12px' },
  urlTexto: { margin: 0, color: '#555', fontSize: '11px', textAlign: 'center', wordBreak: 'break-all' },
  btnDescargar: { width: '100%', padding: '10px', backgroundColor: '#B87333', color: '#000000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' },
  btnEliminar: { width: '100%', padding: '10px', backgroundColor: 'transparent', color: '#e57373', border: '1px solid #e57373', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  btnReactivar: { width: '100%', padding: '10px', backgroundColor: 'rgba(45,106,79,0.2)', color: '#66bb6a', border: '1px solid #66bb6a', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  sinResultados: { color: '#666', textAlign: 'center', marginTop: '60px', fontSize: '15px' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { backgroundColor: '#1A1A1A', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '360px', border: '1px solid #333', display: 'flex', flexDirection: 'column', gap: '16px' },
  modalTitulo: { margin: 0, color: '#FFFFFF', fontSize: '18px', fontWeight: '700' },
  label: { color: '#AAAAAA', fontSize: '13px', fontWeight: '600' },
  input: { padding: '12px 14px', backgroundColor: '#2A2A2A', border: '1px solid #444', borderRadius: '10px', color: '#FFFFFF', fontSize: '16px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  errorTexto: { margin: 0, color: '#e57373', fontSize: '13px' },
  modalBotones: { display: 'flex', gap: '10px', justifyContent: 'flex-end' },
  btnCancelar: { padding: '10px 18px', backgroundColor: 'transparent', color: '#888', border: '1px solid #444', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
  btnGuardar: { padding: '10px 18px', backgroundColor: '#B87333', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' },
};

export default MesasQR;
