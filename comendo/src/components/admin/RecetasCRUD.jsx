// src/components/admin/RecetasCRUD.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../api/supabase';
import { exportarRecetas } from '../../api/exportService';
import ModalConfirm from '../ModalConfirm';

const RecetasCRUD = () => {
  const [productos, setProductos] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [recetas, setRecetas] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [modalQuitarInsumo, setModalQuitarInsumo] = useState(null);

  const formVacio = { id_insumo: '', cantidad_requerida: '' };
  const [form, setForm] = useState(formVacio);

  const cargarDatos = async () => {
    setCargando(true);
    const [{ data: prods }, { data: ins }, { data: recs }] = await Promise.all([
      supabase.from('productos').select('id_producto, nombre').order('nombre'),
      supabase.from('insumos').select('id_insumo, nombre, unidad_medida').order('nombre'),
      supabase.from('recetas').select(`
        id_producto,
        id_insumo,
        cantidad_requerida,
        insumos ( nombre, unidad_medida )
      `),
    ]);
    setProductos(prods || []);
    setInsumos(ins || []);
    setRecetas(recs || []);
    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const recetasDelProducto = recetas.filter(
    (r) => r.id_producto === productoSeleccionado?.id_producto
  );

  const insumosDisponibles = insumos.filter(
    (i) => !recetasDelProducto.find((r) => r.id_insumo === i.id_insumo)
  );

  const abrirAgregarInsumo = () => {
    setForm(formVacio);
    setError(null);
    setModalAbierto(true);
  };

  const handleGuardar = async () => {
    if (!form.id_insumo || !form.cantidad_requerida) {
      setError('Selecciona un insumo y define la cantidad.');
      return;
    }
    try {
      setGuardando(true);
      setError(null);
      await supabase.from('recetas').insert({
        id_producto: productoSeleccionado.id_producto,
        id_insumo: form.id_insumo,
        cantidad_requerida: parseFloat(form.cantidad_requerida),
      });
      await cargarDatos();
      setModalAbierto(false);
    } catch (err) {
      setError('Error al guardar. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  // ── Eliminar insumo de receta ─────────────────────────────────────────
  const handleEliminarInsumo = (idProducto, idInsumo) => {
    setModalQuitarInsumo({ idProducto, idInsumo });
  };

  const confirmarQuitarInsumo = async () => {
    await supabase
      .from('recetas')
      .delete()
      .eq('id_producto', modalQuitarInsumo.idProducto)
      .eq('id_insumo', modalQuitarInsumo.idInsumo);
    setModalQuitarInsumo(null);
    await cargarDatos();
  };

  if (cargando) return <p style={{ color: '#fff' }}>Cargando recetas...</p>;

  return (
    <div style={styles.pagina}>

      {/* Panel izquierdo — lista de productos */}
      <div style={styles.panelProductos}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, color: '#fff', fontSize: '16px', fontWeight: '700' }}>🍛 Productos</h3>
          <button
            style={styles.btnExportar}
            onClick={() => exportarRecetas(productos, recetas)}
          >
            ⬇ Excel
          </button>
        </div>

        {productos.map((p) => (
          <button
            key={p.id_producto}
            style={{
              ...styles.btnProducto,
              ...(productoSeleccionado?.id_producto === p.id_producto
                ? styles.btnProductoActivo : {}),
            }}
            onClick={() => setProductoSeleccionado(p)}
          >
            {p.nombre}
            <span style={styles.badgeInsumos}>
              {recetas.filter(r => r.id_producto === p.id_producto).length}
            </span>
          </button>
        ))}
      </div>

      {/* Panel derecho — receta del producto seleccionado */}
      <div style={styles.panelReceta}>
        {!productoSeleccionado ? (
          <div style={styles.placeholder}>
            <p>👈 Selecciona un producto para ver y editar su receta</p>
          </div>
        ) : (
          <>
            <div style={styles.recetaHeader}>
              <h3 style={styles.panelTitulo}>
                Receta: {productoSeleccionado.nombre}
              </h3>
              {insumosDisponibles.length > 0 && (
                <button style={styles.btnAgregar} onClick={abrirAgregarInsumo}>
                  + Agregar Insumo
                </button>
              )}
            </div>

            {recetasDelProducto.length === 0 ? (
              <p style={styles.vacio}>Este producto no tiene insumos asignados aún.</p>
            ) : (
              <div style={styles.listaInsumos}>
                {recetasDelProducto.map((r) => (
                  <div key={r.id_insumo} style={styles.insumoItem}>
                    <div style={styles.insumoInfo}>
                      <span style={styles.insumoNombre}>{r.insumos?.nombre}</span>
                      <span style={styles.insumoCantidad}>
                        {r.cantidad_requerida} {r.insumos?.unidad_medida}
                      </span>
                    </div>
                    <button
                      style={styles.btnQuitar}
                      onClick={() => handleEliminarInsumo(r.id_producto, r.id_insumo)}
                    >
                      ✕ Quitar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal agregar insumo */}
      {modalAbierto && (
        <>
          <div style={styles.overlay} onClick={() => setModalAbierto(false)} />
          <div style={styles.modal}>
            <h3 style={styles.modalTitulo}>+ Agregar Insumo a Receta</h3>
            <div style={styles.campos}>
              <select
                style={styles.input}
                value={form.id_insumo}
                onChange={(e) => setForm({ ...form, id_insumo: e.target.value })}
              >
                <option value="">Selecciona un insumo</option>
                {insumosDisponibles.map((i) => (
                  <option key={i.id_insumo} value={i.id_insumo}>
                    {i.nombre} ({i.unidad_medida})
                  </option>
                ))}
              </select>
              <input
                style={styles.input}
                placeholder="Cantidad requerida por porción"
                type="number"
                value={form.cantidad_requerida}
                onChange={(e) => setForm({ ...form, cantidad_requerida: e.target.value })}
              />
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

      {/* ✅ Modal confirmar quitar insumo */}
      {modalQuitarInsumo && (
        <ModalConfirm
          titulo="Quitar Insumo"
          mensaje="¿Quitar este insumo de la receta?"
          labelConfirmar="Quitar"
          colorConfirmar="#F57C00"
          onConfirmar={confirmarQuitarInsumo}
          onCancelar={() => setModalQuitarInsumo(null)}
        />
      )}

    </div>
  );
};

const styles = {
  pagina: { display: 'flex', gap: '20px', height: 'calc(100vh - 120px)' },
  panelProductos: { width: '240px', backgroundColor: '#16213e', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' },
  panelTitulo: { margin: '0 0 12px', color: '#fff', fontSize: '16px', fontWeight: '700' },
  btnProducto: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#0f3460', border: 'none', borderRadius: '8px', color: '#ccc', cursor: 'pointer', fontSize: '14px', textAlign: 'left', fontWeight: '600' },
  btnProductoActivo: { backgroundColor: '#2D6A4F', color: '#fff' },
  badgeInsumos: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '10px', padding: '2px 8px', fontSize: '12px' },
  panelReceta: { flex: 1, backgroundColor: '#16213e', borderRadius: '12px', padding: '20px', overflowY: 'auto' },
  placeholder: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#555', fontSize: '16px' },
  recetaHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  btnAgregar: { padding: '8px 16px', backgroundColor: '#2D6A4F', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' },
  btnExportar: { padding: '6px 10px', backgroundColor: '#1565C0', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '12px' },
  vacio: { color: '#555', fontSize: '14px' },
  listaInsumos: { display: 'flex', flexDirection: 'column', gap: '10px' },
  insumoItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f3460', borderRadius: '8px', padding: '14px' },
  insumoInfo: { display: 'flex', flexDirection: 'column', gap: '4px' },
  insumoNombre: { color: '#fff', fontWeight: '600', fontSize: '15px' },
  insumoCantidad: { color: '#4CAF50', fontSize: '13px' },
  btnQuitar: { padding: '6px 12px', backgroundColor: '#E53935', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100 },
  modal: { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: '#16213e', borderRadius: '16px', padding: '32px', width: '90%', maxWidth: '480px', zIndex: 101, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' },
  modalTitulo: { margin: '0 0 24px', color: '#fff', fontSize: '20px' },
  campos: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' },
  input: { padding: '12px', backgroundColor: '#0f3460', border: '1px solid #2D6A4F', borderRadius: '8px', color: '#fff', fontSize: '15px', width: '100%', boxSizing: 'border-box' },
  error: { color: '#E53935', fontSize: '13px', marginBottom: '12px' },
  modalBotones: { display: 'flex', gap: '12px', justifyContent: 'flex-end' },
  btnCancelar: { padding: '10px 20px', backgroundColor: 'transparent', border: '1px solid #555', color: '#ccc', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  btnGuardar: { padding: '10px 20px', backgroundColor: '#2D6A4F', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' },
};

export default RecetasCRUD;