// src/components/admin/InsumosCRUD.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../api/supabase';
import { exportarInsumos } from '../../api/exportService';
import ModalConfirm from '../ModalConfirm';

const UNIDADES = ['Gramos', 'Kilogramos', 'Litros', 'Mililitros', 'Unidades'];

const InsumosCRUD = () => {
  const [insumos, setInsumos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [insumoEditando, setInsumoEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [modalEliminar, setModalEliminar] = useState(null);
  const [verDesactivados, setVerDesactivados] = useState(false);

  const formVacio = { nombre: '', cantidad_stock: '', unidad_medida: 'Gramos' };
  const [form, setForm] = useState(formVacio);

  const cargarInsumos = async () => {
    setCargando(true);
    const { data } = await supabase.from('insumos').select('*').eq('status_', verDesactivados ? 0 : 1).order('nombre');
    setInsumos(data || []);
    setCargando(false);
  };

  useEffect(() => {
    cargarInsumos();
  }, [verDesactivados]);

  const reactivarInsumo = async (insumoId) => {
    await supabase.from('insumos').update({ status_: 1 }).eq('id_insumo', insumoId);
    await cargarInsumos();
  };

  const abrirCrear = () => {
    setInsumoEditando(null);
    setForm(formVacio);
    setError(null);
    setModalAbierto(true);
  };

  const abrirEditar = (insumo) => {
    setInsumoEditando(insumo);
    setForm({
      nombre: insumo.nombre,
      cantidad_stock: insumo.cantidad_stock,
      unidad_medida: insumo.unidad_medida,
    });
    setError(null);
    setModalAbierto(true);
  };

  const handleGuardar = async () => {
    if (!form.nombre || form.cantidad_stock === '') {
      setError('Nombre y stock son obligatorios.');
      return;
    }
    try {
      setGuardando(true);
      setError(null);
      const payload = {
        nombre: form.nombre,
        cantidad_stock: parseFloat(form.cantidad_stock),
        unidad_medida: form.unidad_medida,
      };
      if (insumoEditando) {
        await supabase.from('insumos').update(payload).eq('id_insumo', insumoEditando.id_insumo);
      } else {
        await supabase.from('insumos').insert(payload);
      }
      await cargarInsumos();
      setModalAbierto(false);
    } catch (err) {
      setError('Error al guardar. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = (insumoId) => setModalEliminar(insumoId);

  const confirmarEliminar = async () => {
    await supabase.from('insumos').update({ status_: 0 }).eq('id_insumo', modalEliminar);
    setModalEliminar(null);
    await cargarInsumos();
  };

  const colorStock = (cantidad, unidad) => {
    const limite = unidad === 'Unidades' ? 10 : 1000;
    if (cantidad <= limite * 0.25) return '#E53935';
    if (cantidad <= limite * 0.5) return '#F57C00';
    return '#4CAF50';
  };

  if (cargando) return <p style={{ color: '#fff' }}>Cargando inventario...</p>;

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.titulo}>📦 Gestión de Inventario</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={styles.btnExportar} onClick={() => exportarInsumos(insumos)}>
            ⬇ Exportar Excel
          </button>
          <button
            style={{ ...styles.btnToggleVista, ...(verDesactivados ? styles.btnToggleVistaActivo : {}) }}
            onClick={() => setVerDesactivados(!verDesactivados)}
          >
            {verDesactivados ? '✅ Ver activos' : '🗂 Ver desactivados'}
          </button>
          {!verDesactivados && (
            <button style={styles.btnCrear} onClick={abrirCrear}>
              + Nuevo Insumo
            </button>
          )}
        </div>
      </div>

      {/* Alerta stock crítico */}
      {insumos.filter(i => {
        const limite = i.unidad_medida === 'Unidades' ? 10 : 1000;
        return i.cantidad_stock <= limite * 0.25;
      }).length > 0 && (
        <div style={styles.alertaCritica}>
          ⚠️ Hay insumos con stock crítico. Revisa los marcados en rojo.
        </div>
      )}

      {/* Tabla de insumos */}
      <div style={styles.tabla}>
        {insumos.length === 0 ? (
          <p style={{ color: '#888' }}>No hay insumos registrados.</p>
        ) : (
          insumos.map((insumo) => (
            <div key={insumo.id_insumo} style={styles.fila}>
              <div style={styles.filaInfo}>
                <span style={styles.nombre}>{insumo.nombre}</span>
                <div style={styles.stockRow}>
                  <span style={{ ...styles.stock, color: colorStock(insumo.cantidad_stock, insumo.unidad_medida) }}>
                    {insumo.cantidad_stock} {insumo.unidad_medida}
                  </span>
                  {insumo.cantidad_stock <= (insumo.unidad_medida === 'Unidades' ? 2.5 : 250) && (
                    <span style={styles.badgeCritico}>⚠️ CRÍTICO</span>
                  )}
                </div>
              </div>
              <div style={styles.filaAcciones}>
                {verDesactivados ? (
                  <button style={styles.btnReactivar} onClick={() => reactivarInsumo(insumo.id_insumo)}>
                    ♻️ Reactivar
                  </button>
                ) : (
                  <>
                    <button style={styles.btnEditar} onClick={() => abrirEditar(insumo)}>✏️ Editar</button>
                    <button style={styles.btnEliminar} onClick={() => handleEliminar(insumo.id_insumo)}>🗑 Eliminar</button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal crear/editar */}
      {modalAbierto && (
        <>
          <div style={styles.overlay} onClick={() => setModalAbierto(false)} />
          <div style={styles.modal}>
            <h3 style={styles.modalTitulo}>
              {insumoEditando ? '✏️ Editar Insumo' : '+ Nuevo Insumo'}
            </h3>
            <div style={styles.campos}>
              <input
                style={styles.input}
                placeholder="Nombre del insumo (ej: Arroz)"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
              <input
                style={styles.input}
                placeholder="Cantidad en stock (ej: 5000)"
                type="number"
                value={form.cantidad_stock}
                onChange={(e) => setForm({ ...form, cantidad_stock: e.target.value })}
              />
              <select
                style={styles.input}
                value={form.unidad_medida}
                onChange={(e) => setForm({ ...form, unidad_medida: e.target.value })}
              >
                {UNIDADES.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            {error && <p style={styles.error}>{error}</p>}
            <div style={styles.modalBotones}>
              <button style={styles.btnCancelar} onClick={() => setModalAbierto(false)}>Cancelar</button>
              <button
                style={{ ...styles.btnGuardar, opacity: guardando ? 0.7 : 1 }}
                onClick={handleGuardar}
                disabled={guardando}
              >
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ✅ Modal eliminar DENTRO del return */}
      {modalEliminar && (
        <ModalConfirm
          titulo="Desactivar Insumo"
          mensaje="¿Desactivar este insumo? Dejará de aparecer en el sistema pero sus datos se conservan."
          labelConfirmar="Eliminar"
          colorConfirmar="#E53935"
          onConfirmar={confirmarEliminar}
          onCancelar={() => setModalEliminar(null)}
        />
      )}

    </div>
  );
};

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' },
  titulo: { margin: 0, color: '#FFFFFF', fontSize: '20px', fontWeight: '700' },
  btnCrear: { padding: '10px 20px', backgroundColor: '#B87333', color: '#000000', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' },
  btnExportar: { padding: '10px 20px', backgroundColor: 'transparent', color: '#B87333', border: '1px solid #B87333', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
  btnToggleVista: { padding: '10px 16px', backgroundColor: 'transparent', color: '#999', border: '1px solid #333', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  btnToggleVistaActivo: { backgroundColor: 'rgba(184,115,51,0.15)', color: '#B87333', border: '1px solid #B87333' },
  alertaCritica: { backgroundColor: 'rgba(139,26,26,0.2)', border: '1px solid #8B1A1A', borderRadius: '10px', padding: '12px 16px', color: '#ff6b6b', fontSize: '14px', marginBottom: '16px' },
  tabla: { display: 'flex', flexDirection: 'column', gap: '8px' },
  fila: { backgroundColor: '#1A1A1A', borderRadius: '10px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', border: '1px solid #333', transition: 'all 0.2s ease' },
  filaInfo: { display: 'flex', flexDirection: 'column', gap: '6px' },
  nombre: { color: '#FFFFFF', fontWeight: '600', fontSize: '15px' },
  stockRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  stock: { fontSize: '14px', fontWeight: '600' },
  badgeCritico: { backgroundColor: 'rgba(139,26,26,0.3)', color: '#ff6b6b', fontSize: '11px', padding: '2px 8px', borderRadius: '10px', fontWeight: '700', border: '1px solid #8B1A1A' },
  filaAcciones: { display: 'flex', gap: '8px' },
  btnEditar: { padding: '7px 12px', backgroundColor: 'rgba(184,115,51,0.15)', border: '1px solid #B87333', borderRadius: '8px', color: '#B87333', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  btnEliminar: { padding: '7px 12px', backgroundColor: 'rgba(139,26,26,0.15)', border: '1px solid #8B1A1A', borderRadius: '8px', color: '#ff6b6b', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  btnReactivar: { padding: '7px 12px', backgroundColor: 'rgba(184,115,51,0.15)', border: '1px solid #B87333', borderRadius: '8px', color: '#B87333', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100 },
  modal: { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: '#1A1A1A', borderRadius: '16px', padding: '28px', width: '90%', maxWidth: '480px', zIndex: 101, border: '1px solid #333' },
  modalTitulo: { margin: '0 0 20px', color: '#FFFFFF', fontSize: '18px', fontWeight: '700' },
  campos: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' },
  input: { padding: '12px 14px', backgroundColor: '#2A2A2A', border: '1px solid #333', borderRadius: '10px', color: '#FFFFFF', fontSize: '14px', width: '100%', boxSizing: 'border-box', outline: 'none', fontFamily: 'sans-serif' },
  error: { color: '#ff6b6b', fontSize: '13px', marginBottom: '12px', backgroundColor: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '8px', padding: '8px 12px' },
  modalBotones: { display: 'flex', gap: '12px', justifyContent: 'flex-end' },
  btnCancelar: { padding: '10px 20px', backgroundColor: 'transparent', border: '1px solid #333', color: '#999999', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  btnGuardar: { padding: '10px 20px', backgroundColor: '#B87333', color: '#000000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' },
};

export default InsumosCRUD;