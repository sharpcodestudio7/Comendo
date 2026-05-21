// src/components/admin/MovimientosInventario.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../api/supabase';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const TIPOS = {
  Entrada: { color: '#1B5E20', bg: 'rgba(27,94,32,0.2)', emoji: '📥' },
  Salida:  { color: '#8B1A1A', bg: 'rgba(139,26,26,0.2)', emoji: '📤' },
  Ajuste:  { color: '#7B5B00', bg: 'rgba(123,91,0,0.2)', emoji: '🔧' },
};

const MovimientosInventario = () => {
  const [insumos, setInsumos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [filtroInsumo, setFiltroInsumo] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  const formVacio = { id_insumo: '', tipo: 'Entrada', cantidad: '', motivo: '' };
  const [form, setForm] = useState(formVacio);

  const cargarDatos = async () => {
    setCargando(true);
    const [{ data: ins }, { data: movs }] = await Promise.all([
      supabase.from('insumos').select('*').eq('status_', 1).order('nombre'),
      supabase
        .from('movimientos_inventario')
        .select(`*, insumos ( nombre, unidad_medida )`)
        .order('fecha', { ascending: false })
        .limit(100),
    ]);

    setInsumos(ins || []);
    setMovimientos(movs || []);
    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleGuardar = async () => {
    if (!form.id_insumo || !form.cantidad || !form.motivo) {
      setError('Todos los campos son obligatorios.');
      return;
    }
    if (parseFloat(form.cantidad) <= 0) {
      setError('La cantidad debe ser mayor a 0.');
      return;
    }
    try {
      setGuardando(true);
      setError(null);

      const { data: insumo } = await supabase
        .from('insumos')
        .select('cantidad_stock')
        .eq('id_insumo', form.id_insumo)
        .single();

      const cantidadAnterior = insumo.cantidad_stock;
      const cantidad = parseFloat(form.cantidad);
      let cantidadNueva;

      if (form.tipo === 'Entrada') {
        cantidadNueva = cantidadAnterior + cantidad;
      } else if (form.tipo === 'Salida') {
        cantidadNueva = Math.max(0, cantidadAnterior - cantidad);
      } else {
        cantidadNueva = cantidad;
      }

      await supabase
        .from('insumos')
        .update({ cantidad_stock: cantidadNueva })
        .eq('id_insumo', form.id_insumo);

      await supabase
        .from('movimientos_inventario')
        .insert({
          id_insumo: form.id_insumo,
          tipo: form.tipo,
          cantidad: form.tipo === 'Ajuste'
            ? Math.abs(cantidadNueva - cantidadAnterior)
            : cantidad,
          cantidad_anterior: cantidadAnterior,
          cantidad_nueva: cantidadNueva,
          motivo: form.motivo,
          id_pedido: null,
        });

      await cargarDatos();
      setModalAbierto(false);
      setForm(formVacio);
    } catch (err) {
      setError('Error al registrar. Intenta de nuevo.');
      console.error(err);
    } finally {
      setGuardando(false);
    }
  };

  const exportarHistorial = () => {
    const datos = movimientosFiltrados.map((m) => ({
      'Fecha': new Date(m.fecha).toLocaleString('es-CO'),
      'Insumo': m.insumos?.nombre || '—',
      'Tipo': m.tipo,
      'Cantidad': m.cantidad,
      'Unidad': m.insumos?.unidad_medida || '—',
      'Stock Anterior': m.cantidad_anterior,
      'Stock Nuevo': m.cantidad_nueva,
      'Motivo': m.motivo || '—',
    }));
    const hoja = XLSX.utils.json_to_sheet(datos);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Movimientos');
    const buffer = XLSX.write(libro, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    saveAs(blob, `comendo_movimientos_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const formatCOP = (valor) => new Intl.NumberFormat('es-CO').format(valor);

  const movimientosFiltrados = movimientos.filter((m) => {
    const coincideInsumo = !filtroInsumo || m.id_insumo === filtroInsumo;
    const coincideTipo = !filtroTipo || m.tipo === filtroTipo;
    return coincideInsumo && coincideTipo;
  });

  if (cargando) return <p style={{ color: '#fff', padding: '20px' }}>Cargando movimientos...</p>;

  return (
    <div>
      <div style={styles.header}>
        <h2 style={styles.titulo}>📊 Movimientos de Inventario</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={styles.btnExportar} onClick={exportarHistorial}>
            ⬇ Exportar Excel
          </button>
          <button style={styles.btnCrear} onClick={() => { setForm(formVacio); setError(null); setModalAbierto(true); }}>
            + Registrar Movimiento
          </button>
        </div>
      </div>

      <div style={styles.filtros}>
        <select
          style={styles.filtroSelect}
          value={filtroInsumo}
          onChange={(e) => setFiltroInsumo(e.target.value)}
        >
          <option value="">Todos los insumos</option>
          {insumos.map((i) => (
            <option key={i.id_insumo} value={i.id_insumo}>{i.nombre}</option>
          ))}
        </select>

        <select
          style={styles.filtroSelect}
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
        >
          <option value="">Todos los tipos</option>
          <option value="Entrada">📥 Entradas</option>
          <option value="Salida">📤 Salidas</option>
          <option value="Ajuste">🔧 Ajustes</option>
        </select>

        <span style={styles.totalRegistros}>{movimientosFiltrados.length} registros</span>
      </div>

      <div style={styles.tabla}>
        {movimientosFiltrados.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center', marginTop: '40px' }}>
            No hay movimientos registrados aún. Toca "+ Registrar Movimiento" para comenzar.
          </p>
        ) : (
          movimientosFiltrados.map((m) => {
            const tipo = TIPOS[m.tipo] || TIPOS.Ajuste;
            return (
              <div key={m.id_movimiento} style={styles.fila}>
                <div style={{ ...styles.tipoBadge, backgroundColor: tipo.color }}>
                  {tipo.emoji} {m.tipo}
                </div>
                <div style={styles.filaInfo}>
                  <span style={styles.insumoNombre}>{m.insumos?.nombre || '—'}</span>
                  <span style={styles.motivo}>{m.motivo}</span>
                </div>
                <div style={styles.cantidades}>
                  <span style={{ ...styles.cantidadLabel, color: m.tipo === 'Entrada' ? '#4CAF50' : m.tipo === 'Salida' ? '#ff6b6b' : '#B87333' }}>
                    {m.tipo === 'Entrada' ? '+' : m.tipo === 'Salida' ? '-' : '→'}
                    {formatCOP(m.cantidad)} {m.insumos?.unidad_medida}
                  </span>
                  <span style={styles.stockFlow}>
                    {formatCOP(m.cantidad_anterior)} → {formatCOP(m.cantidad_nueva)}
                  </span>
                </div>
                <div style={styles.fecha}>
                  {new Date(m.fecha).toLocaleString('es-CO', {
                    day: '2-digit', month: '2-digit',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {modalAbierto && (
        <>
          <div style={styles.overlay} onClick={() => setModalAbierto(false)} />
          <div style={styles.modal}>
            <h3 style={styles.modalTitulo}>+ Registrar Movimiento</h3>
            <div style={styles.campos}>
              <div>
                <label style={styles.label}>Insumo</label>
                <select
                  style={styles.input}
                  value={form.id_insumo}
                  onChange={(e) => setForm({ ...form, id_insumo: e.target.value })}
                >
                  <option value="">Selecciona un insumo</option>
                  {insumos.map((i) => (
                    <option key={i.id_insumo} value={i.id_insumo}>
                      {i.nombre} — Stock: {formatCOP(i.cantidad_stock)} {i.unidad_medida}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={styles.label}>Tipo de Movimiento</label>
                <div style={styles.tipoSelector}>
                  {Object.keys(TIPOS).map((tipo) => (
                    <button
                      key={tipo}
                      style={{
                        ...styles.tipoBtnSelector,
                        backgroundColor: form.tipo === tipo ? TIPOS[tipo].color : '#2A2A2A',
                        border: form.tipo === tipo ? `2px solid ${TIPOS[tipo].color}` : '2px solid #333',
                      }}
                      onClick={() => setForm({ ...form, tipo })}
                    >
                      {TIPOS[tipo].emoji} {tipo}
                    </button>
                  ))}
                </div>
              </div>

              <p style={styles.tipoHint}>
                {form.tipo === 'Entrada' && '📥 Se sumará al stock actual del insumo.'}
                {form.tipo === 'Salida' && '📤 Se restará del stock actual del insumo.'}
                {form.tipo === 'Ajuste' && '🔧 Ingresa el nuevo stock total del insumo.'}
              </p>

              <div>
                <label style={styles.label}>
                  {form.tipo === 'Ajuste' ? 'Nuevo stock total' : 'Cantidad'}
                </label>
                <input
                  style={styles.input}
                  type="number"
                  placeholder={form.tipo === 'Ajuste' ? 'Ej: 15000' : 'Ej: 5000'}
                  value={form.cantidad}
                  onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                />
              </div>

              <div>
                <label style={styles.label}>Motivo</label>
                <input
                  style={styles.input}
                  placeholder={
                    form.tipo === 'Entrada' ? 'Ej: Compra proveedor Distribuidora Paisa' :
                    form.tipo === 'Salida' ? 'Ej: Merma por vencimiento' :
                    'Ej: Conteo físico — diferencia encontrada'
                  }
                  value={form.motivo}
                  onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                />
              </div>
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
                {guardando ? 'Guardando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' },
  titulo: { margin: 0, color: '#FFFFFF', fontSize: '20px', fontWeight: '700' },
  btnCrear: { padding: '10px 20px', backgroundColor: '#B87333', color: '#000000', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' },
  btnExportar: { padding: '10px 20px', backgroundColor: 'transparent', color: '#B87333', border: '1px solid #B87333', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
  filtros: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' },
  filtroSelect: { padding: '10px 14px', backgroundColor: '#2A2A2A', border: '1px solid #333', borderRadius: '8px', color: '#FFFFFF', fontSize: '13px', cursor: 'pointer', outline: 'none' },
  totalRegistros: { color: '#666', fontSize: '13px', marginLeft: 'auto' },
  tabla: { display: 'flex', flexDirection: 'column', gap: '8px' },
  fila: { backgroundColor: '#1A1A1A', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', border: '1px solid #333' },
  tipoBadge: { padding: '5px 12px', borderRadius: '20px', color: '#fff', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap' },
  filaInfo: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '160px' },
  insumoNombre: { color: '#FFFFFF', fontWeight: '600', fontSize: '14px' },
  motivo: { color: '#999999', fontSize: '12px' },
  cantidades: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' },
  cantidadLabel: { fontWeight: '700', fontSize: '14px' },
  stockFlow: { color: '#555', fontSize: '12px' },
  fecha: { color: '#666', fontSize: '12px', whiteSpace: 'nowrap' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100 },
  modal: { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: '#1A1A1A', borderRadius: '16px', padding: '28px', width: '90%', maxWidth: '500px', zIndex: 101, border: '1px solid #333', maxHeight: '90vh', overflowY: 'auto' },
  modalTitulo: { margin: '0 0 20px', color: '#FFFFFF', fontSize: '18px', fontWeight: '700' },
  campos: { display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' },
  label: { color: '#999999', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' },
  input: { padding: '12px 14px', backgroundColor: '#2A2A2A', border: '1px solid #333', borderRadius: '10px', color: '#FFFFFF', fontSize: '14px', width: '100%', boxSizing: 'border-box', outline: 'none', fontFamily: 'sans-serif' },
  tipoSelector: { display: 'flex', gap: '10px' },
  tipoBtnSelector: { flex: 1, padding: '10px', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: '700', fontSize: '13px', minHeight: '44px' },
  tipoHint: { color: '#666', fontSize: '12px', margin: '0', fontStyle: 'italic' },
  error: { color: '#ff6b6b', fontSize: '13px', marginBottom: '12px', backgroundColor: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '8px', padding: '8px 12px' },
  modalBotones: { display: 'flex', gap: '12px', justifyContent: 'flex-end' },
  btnCancelar: { padding: '10px 20px', backgroundColor: 'transparent', border: '1px solid #333', color: '#999999', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  btnGuardar: { padding: '10px 20px', backgroundColor: '#B87333', color: '#000000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' },
};

export default MovimientosInventario;