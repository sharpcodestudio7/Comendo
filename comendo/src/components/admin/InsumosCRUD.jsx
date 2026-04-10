// src/components/admin/InsumosCRUD.jsx
// Gestión de insumos del inventario — Crear, editar, eliminar y ver stock

import { useState, useEffect } from 'react';
import { supabase } from '../../api/supabase';
import { exportarInsumos } from '../../api/exportService';

const UNIDADES = ['Gramos', 'Kilogramos', 'Litros', 'Mililitros', 'Unidades'];

const InsumosCRUD = () => {
  const [insumos, setInsumos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [insumoEditando, setInsumoEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  const formVacio = { nombre: '', cantidad_stock: '', unidad_medida: 'Gramos' };
  const [form, setForm] = useState(formVacio);

  const cargarInsumos = async () => {
    setCargando(true);
    const { data } = await supabase
      .from('insumos')
      .select('*')
      .order('nombre');
    setInsumos(data || []);
    setCargando(false);
  };

  useEffect(() => {
    cargarInsumos();
  }, []);

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

  const handleEliminar = async (insumoId) => {
    if (!window.confirm('¿Eliminar este insumo? Esto también eliminará sus recetas asociadas.')) return;
    await supabase.from('recetas').delete().eq('id_insumo', insumoId);
    await supabase.from('insumos').delete().eq('id_insumo', insumoId);
    await cargarInsumos();
  };

  // Determina el color del stock según nivel
  const colorStock = (cantidad, unidad) => {
    const limite = unidad === 'Unidades' ? 10 : 1000;
    if (cantidad <= limite * 0.25) return '#E53935';      // Crítico — rojo
    if (cantidad <= limite * 0.5) return '#F57C00';       // Bajo — naranja
    return '#4CAF50';                                      // Normal — verde
  };

  if (cargando) return <p style={{ color: '#fff' }}>Cargando inventario...</p>;

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
  <h2 style={styles.titulo}>📦 Gestión de Inventario</h2>
  <div style={{ display: 'flex', gap: '10px' }}>
    <button
      style={styles.btnExportar}
      onClick={() => exportarInsumos(insumos)}
    >
      ⬇ Exportar Excel
    </button>
    <button style={styles.btnCrear} onClick={abrirCrear}>
      + Nuevo Insumo
    </button>
  </div>
</div>

      {/* Resumen de stock crítico */}
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
                  <span style={{
                    ...styles.stock,
                    color: colorStock(insumo.cantidad_stock, insumo.unidad_medida),
                  }}>
                    {insumo.cantidad_stock} {insumo.unidad_medida}
                  </span>
                  {insumo.cantidad_stock <= (insumo.unidad_medida === 'Unidades' ? 2.5 : 250) && (
                    <span style={styles.badgeCritico}>⚠️ CRÍTICO</span>
                  )}
                </div>
              </div>
              <div style={styles.filaAcciones}>
                <button style={styles.btnEditar} onClick={() => abrirEditar(insumo)}>
                  ✏️ Editar
                </button>
                <button style={styles.btnEliminar} onClick={() => handleEliminar(insumo.id_insumo)}>
                  🗑 Eliminar
                </button>
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
              <button style={styles.btnCancelar} onClick={() => setModalAbierto(false)}>
                Cancelar
              </button>
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
    </div>
  );
};

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  titulo: { margin: 0, color: '#fff', fontSize: '22px' },
  btnCrear: { padding: '10px 20px', backgroundColor: '#2D6A4F', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '15px' },
  alertaCritica: { backgroundColor: '#4a1515', border: '1px solid #E53935', borderRadius: '8px', padding: '12px 16px', color: '#ff8a80', fontSize: '14px', marginBottom: '16px' },
  tabla: { display: 'flex', flexDirection: 'column', gap: '10px' },
  fila: { backgroundColor: '#16213e', borderRadius: '10px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' },
  filaInfo: { display: 'flex', flexDirection: 'column', gap: '6px' },
  nombre: { color: '#fff', fontWeight: '700', fontSize: '16px' },
  stockRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  stock: { fontSize: '14px', fontWeight: '600' },
  badgeCritico: { backgroundColor: '#4a1515', color: '#ff8a80', fontSize: '11px', padding: '2px 8px', borderRadius: '10px', fontWeight: '700' },
  filaAcciones: { display: 'flex', gap: '8px' },
  btnEditar: { padding: '8px 12px', backgroundColor: '#F57C00', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  btnEliminar: { padding: '8px 12px', backgroundColor: '#E53935', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100 },
  modal: { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: '#16213e', borderRadius: '16px', padding: '32px', width: '90%', maxWidth: '480px', zIndex: 101, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' },
  modalTitulo: { margin: '0 0 24px', color: '#fff', fontSize: '20px' },
  campos: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' },
  input: { padding: '12px', backgroundColor: '#0f3460', border: '1px solid #2D6A4F', borderRadius: '8px', color: '#fff', fontSize: '15px', width: '100%', boxSizing: 'border-box' },
  error: { color: '#E53935', fontSize: '13px', marginBottom: '12px' },
  modalBotones: { display: 'flex', gap: '12px', justifyContent: 'flex-end' },
  btnCancelar: { padding: '10px 20px', backgroundColor: 'transparent', border: '1px solid #555', color: '#ccc', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  btnGuardar: { padding: '10px 20px', backgroundColor: '#2D6A4F', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' },
  btnExportar: { padding: '10px 20px', backgroundColor: '#1565C0', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '15px' },
};

export default InsumosCRUD;