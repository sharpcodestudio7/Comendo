// src/components/ProductDetailModal.jsx
// Modal de detalle del producto con personalización de ingredientes y notas.
// Se abre al tocar "Añadir" en el ProductCard.
// Carga la receta del producto desde Supabase para mostrar los ingredientes como chips.

import { useState, useEffect } from 'react';
import { supabase } from '../api/supabase';
import useCartStore from '../store/useCartStore';

const ProductDetailModal = ({ producto, onCerrar }) => {
  // Estado local del modal
  const [ingredientes, setIngredientes] = useState([]);
  const [excluidos, setExcluidos] = useState([]);  // IDs de insumos excluidos
  const [notas, setNotas] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [cargando, setCargando] = useState(true);

  // Acción del store para agregar al carrito
  const { agregarItem, toggleExclusion, setNotas: setNotasStore } = useCartStore();

  // ── Cargar ingredientes de la receta desde Supabase ──────────────────
  useEffect(() => {
    const cargarReceta = async () => {
      setCargando(true);
      const { data, error } = await supabase
        .from('recetas')
        .select('id_insumo, cantidad_requerida, insumos(id_insumo, nombre, unidad_medida)')
        .eq('id_producto', producto.id_producto);

      if (!error && data) {
        // Transformar los datos en un array limpio
        const lista = data.map((r) => ({
          id_insumo: r.id_insumo,
          nombre: r.insumos.nombre,
          cantidad_requerida: r.cantidad_requerida,
          unidad_medida: r.insumos.unidad_medida,
        }));
        setIngredientes(lista);
      }
      setCargando(false);
    };

    cargarReceta();
  }, [producto.id_producto]);

  // ── Alternar exclusión de un ingrediente ─────────────────────────────
  const toggleIngrediente = (id_insumo) => {
    setExcluidos((prev) =>
      prev.includes(id_insumo)
        ? prev.filter((id) => id !== id_insumo)
        : [...prev, id_insumo]
    );
  };

  // ── Confirmar y agregar al carrito ───────────────────────────────────
  const handleAgregar = () => {
    // Agrega el producto N veces según la cantidad
    for (let i = 0; i < cantidad; i++) {
      agregarItem(producto);
    }

    // Registra las exclusiones seleccionadas
    const exclusionesSeleccionadas = ingredientes.filter((ing) =>
      excluidos.includes(ing.id_insumo)
    );
    exclusionesSeleccionadas.forEach((insumo) => {
      toggleExclusion(producto.id_producto, insumo);
    });

    // Guarda las notas si el comensal escribió algo
    if (notas.trim()) {
      setNotasStore(producto.id_producto, notas.trim());
    }

    onCerrar();
  };

  // ── Formato de precio ────────────────────────────────────────────────
  const formatearPrecio = (valor) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(valor);

  return (
    <>
      {/* Overlay oscuro */}
      <div style={styles.overlay} onClick={onCerrar} />

      {/* Modal */}
      <div style={styles.modal}>
        {/* Botón cerrar */}
        <button style={styles.btnCerrar} onClick={onCerrar}>✕</button>

        {/* Imagen del producto */}
        {producto.imagen_url && (
          <img src={producto.imagen_url} alt={producto.nombre} style={styles.imagen} />
        )}

        {/* Info del producto */}
        <div style={styles.contenido}>
          <h2 style={styles.nombre}>{producto.nombre}</h2>
          <p style={styles.precio}>{formatearPrecio(producto.precio)}</p>
          <p style={styles.descripcion}>{producto.descripcion}</p>

          {/* ── Sección de ingredientes ──────────────────────────────── */}
          <div style={styles.seccion}>
            <h3 style={styles.seccionTitulo}>Personaliza tu plato</h3>
            <p style={styles.seccionSub}>Toca un ingrediente para excluirlo</p>

            {cargando ? (
              <p style={styles.cargando}>Cargando ingredientes...</p>
            ) : ingredientes.length === 0 ? (
              <p style={styles.sinReceta}>Este producto no tiene receta registrada.</p>
            ) : (
              <div style={styles.chips}>
                {ingredientes.map((ing) => {
                  const estaExcluido = excluidos.includes(ing.id_insumo);
                  return (
                    <button
                      key={ing.id_insumo}
                      onClick={() => toggleIngrediente(ing.id_insumo)}
                      style={{
                        ...styles.chip,
                        ...(estaExcluido ? styles.chipExcluido : styles.chipIncluido),
                      }}
                    >
                      <span style={styles.chipIcon}>{estaExcluido ? '✕' : '✓'}</span>
                      <span style={estaExcluido ? styles.chipTextoExcluido : undefined}>
                        {ing.nombre}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Campo de notas ───────────────────────────────────────── */}
          <div style={styles.seccion}>
            <h3 style={styles.seccionTitulo}>Notas para la cocina (opcional)</h3>
            <textarea
              style={styles.textarea}
              placeholder="Ej: Huevo bien cocido, sin picante..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              maxLength={200}
              rows={2}
            />
            <p style={styles.charCount}>{notas.length}/200</p>
          </div>

          {/* ── Selector de cantidad ─────────────────────────────────── */}
          <div style={styles.seccion}>
            <h3 style={styles.seccionTitulo}>Cantidad</h3>
            <div style={styles.contador}>
              <button
                style={styles.btnContador}
                onClick={() => setCantidad((c) => Math.max(1, c - 1))}
              >
                −
              </button>
              <span style={styles.cantidad}>{cantidad}</span>
              <button
                style={styles.btnContadorMas}
                onClick={() => setCantidad((c) => c + 1)}
              >
                +
              </button>
            </div>
          </div>

          {/* ── Botón de agregar ─────────────────────────────────────── */}
          <button style={styles.btnAgregar} onClick={handleAgregar}>
            Añadir al pedido — {formatearPrecio(producto.precio * cantidad)}
          </button>
        </div>
      </div>
    </>
  );
};

// ── Estilos ────────────────────────────────────────────────────────────
const styles = {
  overlay: {
    position: 'fixed', inset: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 200,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  modal: {
    position: 'fixed',
    bottom: 0, left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: '420px',
    backgroundColor: '#fff',
    borderRadius: '20px 20px 0 0',
    maxHeight: '85vh',
    overflowY: 'auto',
    zIndex: 201,
  },
  btnCerrar: {
    position: 'absolute', top: '12px', right: '12px',
    background: 'rgba(0,0,0,0.5)', color: '#fff',
    border: 'none', borderRadius: '50%',
    width: '32px', height: '32px',
    fontSize: '16px', cursor: 'pointer', zIndex: 202,
  },
  imagen: {
    width: '100%', height: '200px',
    objectFit: 'cover',
    borderRadius: '20px 20px 0 0',
  },
  contenido: { padding: '16px 20px 24px' },
  nombre: { margin: '0 0 4px', fontSize: '20px', fontWeight: '700' },
  precio: { margin: '0 0 4px', fontSize: '18px', fontWeight: '700', color: '#2e7d32' },
  descripcion: { margin: '0 0 16px', fontSize: '13px', color: '#666' },

  // Secciones
  seccion: {
    borderTop: '1px solid #eee',
    paddingTop: '12px', marginBottom: '12px',
  },
  seccionTitulo: { margin: '0 0 4px', fontSize: '14px', fontWeight: '600' },
  seccionSub: { margin: '0 0 10px', fontSize: '12px', color: '#888' },

  // Chips de ingredientes
  chips: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  chip: {
    display: 'flex', alignItems: 'center', gap: '4px',
    padding: '6px 14px', borderRadius: '20px',
    fontSize: '13px', fontWeight: '500',
    cursor: 'pointer', border: '1.5px solid',
    transition: 'all 0.2s',
  },
  chipIncluido: {
    backgroundColor: '#e8f5e9', borderColor: '#2e7d32', color: '#2e7d32',
  },
  chipExcluido: {
    backgroundColor: '#ffeaea', borderColor: '#d32f2f', color: '#d32f2f',
  },
  chipIcon: { fontSize: '11px' },
  chipTextoExcluido: { textDecoration: 'line-through' },

  // Notas
  textarea: {
    width: '100%', padding: '10px 12px',
    border: '1px solid #ddd', borderRadius: '10px',
    fontSize: '14px', fontFamily: 'inherit',
    resize: 'none', backgroundColor: '#fafafa',
    boxSizing: 'border-box',
  },
  charCount: { textAlign: 'right', fontSize: '11px', color: '#aaa', margin: '4px 0 0' },
  cargando: { fontSize: '13px', color: '#999' },
  sinReceta: { fontSize: '13px', color: '#999', fontStyle: 'italic' },

  // Contador
  contador: { display: 'flex', alignItems: 'center', gap: '16px' },
  btnContador: {
    width: '36px', height: '36px', borderRadius: '50%',
    border: '2px solid #2e7d32', backgroundColor: '#fff',
    color: '#2e7d32', fontSize: '20px', cursor: 'pointer', fontWeight: '700',
  },
  btnContadorMas: {
    width: '36px', height: '36px', borderRadius: '50%',
    border: 'none', backgroundColor: '#2e7d32',
    color: '#fff', fontSize: '20px', cursor: 'pointer', fontWeight: '700',
  },
  cantidad: { fontSize: '20px', fontWeight: '700', minWidth: '24px', textAlign: 'center' },

  // Botón agregar
  btnAgregar: {
    width: '100%', padding: '14px',
    backgroundColor: '#2e7d32', color: '#fff',
    border: 'none', borderRadius: '12px',
    fontWeight: '700', fontSize: '16px',
    cursor: 'pointer', marginTop: '8px',
  },
};

export default ProductDetailModal;