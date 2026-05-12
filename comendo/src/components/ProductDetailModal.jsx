import { useState, useEffect } from 'react';
import { supabase } from '../api/supabase';
import useCartStore from '../store/useCartStore';

const MODAL_CSS = `
  @keyframes slideUpModal {
    from { transform: translateY(100%); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  @keyframes fadeInOverlay {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  .modal-premium {
    animation: slideUpModal 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .overlay-fade {
    animation: fadeInOverlay 0.25s ease-out;
  }
  .chip-incluido:hover {
    border-color: #B87333 !important;
    border-width: 1.5px !important;
  }
`;

const ProductDetailModal = ({ producto, onCerrar }) => {
  const [ingredientes, setIngredientes] = useState([]);
  const [excluidos, setExcluidos]       = useState([]);
  const [notas, setNotas]               = useState('');
  const [cantidad, setCantidad]         = useState(1);
  const [cargando, setCargando]         = useState(true);

  const { agregarItem, toggleExclusion, setNotas: setNotasStore } = useCartStore();

  useEffect(() => {
    const cargarReceta = async () => {
      setCargando(true);
      const { data, error } = await supabase
        .from('recetas')
        .select('id_insumo, cantidad_requerida, insumos(id_insumo, nombre, unidad_medida)')
        .eq('id_producto', producto.id_producto);

      if (!error && data) {
        setIngredientes(data.map((r) => ({
          id_insumo:          r.id_insumo,
          nombre:             r.insumos.nombre,
          cantidad_requerida: r.cantidad_requerida,
          unidad_medida:      r.insumos.unidad_medida,
        })));
      }
      setCargando(false);
    };
    cargarReceta();
  }, [producto.id_producto]);

  const toggleIngrediente = (id_insumo) => {
    setExcluidos((prev) =>
      prev.includes(id_insumo) ? prev.filter((id) => id !== id_insumo) : [...prev, id_insumo]
    );
  };

  const handleAgregar = () => {
    for (let i = 0; i < cantidad; i++) agregarItem(producto);

    ingredientes
      .filter((ing) => excluidos.includes(ing.id_insumo))
      .forEach((insumo) => toggleExclusion(producto.id_producto, insumo));

    if (notas.trim()) setNotasStore(producto.id_producto, notas.trim());
    onCerrar();
  };

  const formatearPrecio = (valor) =>
    '$' + new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(valor);

  return (
    <>
      <style>{MODAL_CSS}</style>

      <div className="overlay-fade" style={styles.overlay} onClick={onCerrar} />

      <div className="modal-premium" style={styles.modal}>

        {/* Botón cerrar flotando sobre la imagen */}
        <button style={styles.btnCerrar} onClick={onCerrar}>✕</button>

        {/* ── Hero: imagen con gradiente cinematográfico ── */}
        <div style={styles.heroContainer}>
          {producto.imagen_url ? (
            <img src={producto.imagen_url} alt={producto.nombre} style={styles.heroImagen} />
          ) : (
            <div style={styles.heroPlaceholder} />
          )}
          <div style={styles.heroGradiente} />
          <div style={styles.heroTexto}>
            <h2 style={styles.nombre}>{producto.nombre}</h2>
            <p style={styles.precio}>{formatearPrecio(producto.precio)}</p>
          </div>
        </div>

        {/* ── Contenido ── */}
        <div style={styles.contenido}>

          {producto.descripcion && (
            <p style={styles.descripcion}>{producto.descripcion}</p>
          )}

          <div style={styles.divider} />

          {/* Personalización */}
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
                      className={estaExcluido ? undefined : 'chip-incluido'}
                      onClick={() => toggleIngrediente(ing.id_insumo)}
                      style={{ ...styles.chip, ...(estaExcluido ? styles.chipExcluido : styles.chipIncluido) }}
                    >
                      <span style={styles.chipIcon}>{estaExcluido ? '✕' : '✓'}</span>
                      <span style={estaExcluido ? styles.chipTextoExcluido : undefined}>{ing.nombre}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div style={styles.divider} />

          {/* Notas */}
          <div style={styles.seccion}>
            <h3 style={styles.seccionTitulo}>Notas para la cocina <span style={styles.opcional}>(opcional)</span></h3>
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

          {/* Cantidad */}
          <div style={styles.contadorWrapper}>
            <button style={styles.btnContador} onClick={() => setCantidad((c) => Math.max(1, c - 1))}>−</button>
            <span style={styles.cantidad}>{cantidad}</span>
            <button style={{ ...styles.btnContador, ...styles.btnContadorMas }} onClick={() => setCantidad((c) => c + 1)}>+</button>
          </div>

        </div>

        <div style={styles.btnFooter}>
          <button className="btn-pedido" style={styles.btnAgregar} onClick={handleAgregar}>
            Añadir al pedido — {formatearPrecio(producto.precio * cantidad)}
          </button>
        </div>

      </div>
    </>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.78)',
    zIndex: 200,
  },
  modal: {
    position: 'fixed',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: '480px',
    backgroundColor: '#1A1A1A',
    borderRadius: '20px 20px 0 0',
    maxHeight: '90vh',
    zIndex: 201,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },

  /* Botón cerrar */
  btnCerrar: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '50%',
    width: '36px',
    height: '36px',
    fontSize: '16px',
    cursor: 'pointer',
    zIndex: 202,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Hero */
  heroContainer: {
    position: 'relative',
    width: '100%',
    height: '200px',
    overflow: 'hidden',
    borderRadius: '20px 20px 0 0',
    flexShrink: 0,
  },
  heroImagen: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  heroPlaceholder: {
    width: '100%',
    height: '100%',
    background: 'radial-gradient(circle at 30% 40%, #2e1a0a 0%, #1A1A1A 70%)',
  },
  heroGradiente: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '180px',
    background: 'linear-gradient(to bottom, transparent 0%, rgba(26,26,26,0.75) 50%, #1A1A1A 100%)',
  },
  heroTexto: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '16px 20px 14px',
  },
  nombre: {
    margin: '0 0 4px',
    fontSize: '22px',
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: '1.2',
    textShadow: '0 1px 10px rgba(0,0,0,0.6)',
  },
  precio: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '700',
    color: '#B87333',
  },

  /* Contenido */
  contenido: {
    flex: 1,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    padding: '16px 20px 8px',
  },
  descripcion: { margin: '0', fontSize: '14px', color: '#999', lineHeight: '1.55' },
  divider: { height: '1px', backgroundColor: '#333', margin: '14px 0' },
  seccion: { marginBottom: '4px' },
  seccionTitulo: { margin: '0 0 4px', fontSize: '15px', fontWeight: '500', color: '#FFFFFF' },
  opcional: { fontSize: '13px', fontWeight: '400', color: '#666' },
  seccionSub: { margin: '0 0 10px', fontSize: '12px', color: '#666' },

  /* Chips */
  chips: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  chip: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '7px 14px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    border: '1px solid',
    transition: 'all 0.2s',
    minHeight: '34px',
  },
  chipIncluido: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(184,115,51,0.4)',
    color: '#B87333',
  },
  chipExcluido: {
    backgroundColor: 'rgba(139,26,26,0.2)',
    borderColor: '#8B1A1A',
    color: '#ff6b6b',
  },
  chipIcon: { fontSize: '11px' },
  chipTextoExcluido: { textDecoration: 'line-through' },

  /* Notas */
  textarea: {
    width: '100%',
    padding: '12px',
    border: '1px solid #333',
    borderRadius: '10px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'none',
    backgroundColor: '#2A2A2A',
    color: '#FFFFFF',
    boxSizing: 'border-box',
  },
  charCount: { textAlign: 'right', fontSize: '11px', color: '#555', margin: '4px 0 0' },
  cargando: { fontSize: '13px', color: '#666' },
  sinReceta: { fontSize: '13px', color: '#666', fontStyle: 'italic' },

  /* Cantidad */
  contadorWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    margin: '16px 0',
  },
  btnContador: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '1.5px solid #B87333',
    backgroundColor: 'transparent',
    color: '#B87333',
    fontSize: '22px',
    cursor: 'pointer',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  btnContadorMas: {
    backgroundColor: '#B87333',
    color: '#000000',
    border: 'none',
  },
  cantidad: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#FFFFFF',
    minWidth: '40px',
    textAlign: 'center',
  },

  btnFooter: {
    flexShrink: 0,
    padding: '12px 20px',
    paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
    borderTop: '1px solid #333',
    backgroundColor: '#1A1A1A',
  },
  /* Botón agregar */
  btnAgregar: {
    width: '100%',
    padding: '16px',
    backgroundColor: '#B87333',
    color: '#000000',
    border: 'none',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '16px',
    cursor: 'pointer',
    minHeight: '52px',
  },
};

export default ProductDetailModal;
