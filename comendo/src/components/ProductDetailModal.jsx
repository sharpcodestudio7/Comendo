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

        {/* ── Hero: imagen con gradiente cinematográfico ── */}
        <div style={styles.heroContainer}>
          {producto.imagen_url ? (
            <img src={producto.imagen_url} alt={producto.nombre} style={styles.heroImagen} />
          ) : (
            <div style={styles.heroPlaceholder} />
          )}
          <div style={styles.heroGradiente} />
          {/* Botón cerrar dentro del hero para evitar recorte por border-radius en Android */}
          <button style={styles.btnCerrar} onClick={onCerrar}>✕</button>
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

        </div>

        {/* Footer fijo: contador + botón siempre visibles sin deslizar */}
        <div style={styles.btnFooter}>
          <div style={styles.footerRow}>
            <div style={styles.contadorWrapper}>
              <button style={styles.btnContador} onClick={() => setCantidad((c) => Math.max(1, c - 1))}>−</button>
              <span style={styles.cantidad}>{cantidad}</span>
              <button style={{ ...styles.btnContador, ...styles.btnContadorMas }} onClick={() => setCantidad((c) => c + 1)}>+</button>
            </div>
            <button className="btn-pedido" style={styles.btnAgregar} onClick={handleAgregar}>
              Añadir — {formatearPrecio(producto.precio * cantidad)}
            </button>
          </div>
        </div>

      </div>
    </>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.82)',
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
    borderRadius: '24px 24px 0 0',
    maxHeight: '92vh',
    zIndex: 201,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },

  /* Botón cerrar — dentro de heroContainer (position:relative) para evitar recorte en Android */
  btnCerrar: {
    position: 'absolute',
    top: '14px',
    right: '14px',
    background: 'rgba(0,0,0,0.65)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    color: '#FFFFFF',
    border: '1.5px solid rgba(255,255,255,0.25)',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    minWidth: '40px',
    minHeight: '40px',
    fontSize: '16px',
    cursor: 'pointer',
    zIndex: 203,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },

  /* Hero */
  heroContainer: {
    position: 'relative',
    width: '100%',
    height: '160px',
    overflow: 'hidden',
    borderRadius: '24px 24px 0 0',
    flexShrink: 0,
  },
  heroImagen: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center',
    display: 'block',
  },
  heroPlaceholder: {
    width: '100%',
    height: '100%',
    background: 'radial-gradient(circle at 30% 40%, #3a2010 0%, #1A1A1A 70%)',
  },
  heroGradiente: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.35) 40%, rgba(26,26,26,0.95) 100%)',
  },
  heroTexto: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '14px 20px 14px',
    textAlign: 'center',
  },
  nombre: {
    margin: '0 0 4px',
    fontSize: '20px',
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: '1.2',
    textShadow: '0 2px 12px rgba(0,0,0,0.7)',
    letterSpacing: '-0.3px',
  },
  precio: {
    margin: 0,
    fontSize: '17px',
    fontWeight: '700',
    color: '#C8A84E',
  },

  /* Contenido */
  contenido: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    padding: '18px 20px 8px',
  },
  descripcion: {
    margin: '0',
    fontSize: '14px',
    color: '#999',
    lineHeight: '1.6',
    textAlign: 'center',
  },
  divider: { height: '1px', backgroundColor: '#2C2C2C', margin: '16px 0' },
  seccion: { marginBottom: '4px' },
  seccionTitulo: {
    margin: '0 0 4px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#DDDDDD',
    letterSpacing: '0.3px',
    textTransform: 'uppercase',
  },
  opcional: { fontSize: '12px', fontWeight: '400', color: '#555', textTransform: 'none', letterSpacing: 0 },
  seccionSub: { margin: '0 0 12px', fontSize: '12px', color: '#666' },

  /* Chips */
  chips: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  chip: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '7px 13px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    border: '1.5px solid',
    transition: 'all 0.18s ease',
    minHeight: '34px',
  },
  chipIncluido: {
    backgroundColor: 'rgba(200,168,78,0.07)',
    borderColor: 'rgba(200,168,78,0.35)',
    color: '#C8A84E',
  },
  chipExcluido: {
    backgroundColor: 'rgba(139,26,26,0.18)',
    borderColor: 'rgba(139,26,26,0.7)',
    color: '#ff7070',
  },
  chipIcon: { fontSize: '11px', opacity: 0.85 },
  chipTextoExcluido: { textDecoration: 'line-through', opacity: 0.7 },

  /* Notas */
  textarea: {
    width: '100%',
    padding: '12px 14px',
    border: '1.5px solid #2C2C2C',
    borderRadius: '12px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'none',
    backgroundColor: '#222222',
    color: '#FFFFFF',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.18s',
  },
  charCount: { textAlign: 'right', fontSize: '11px', color: '#555', margin: '4px 0 0' },
  cargando: { fontSize: '13px', color: '#666' },
  sinReceta: { fontSize: '13px', color: '#666', fontStyle: 'italic' },

  btnFooter: {
    flexShrink: 0,
    padding: '12px 20px',
    paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
    borderTop: '1px solid #2C2C2C',
    backgroundColor: '#1A1A1A',
  },
  footerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  /* Cantidad — ahora en el footer fijo */
  contadorWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexShrink: 0,
  },
  btnContador: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    border: '1.5px solid #C8A84E',
    backgroundColor: 'transparent',
    color: '#C8A84E',
    fontSize: '20px',
    cursor: 'pointer',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    transition: 'opacity 0.15s',
  },
  btnContadorMas: {
    backgroundColor: '#C8A84E',
    color: '#0D0D0D',
    border: 'none',
  },
  cantidad: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#FFFFFF',
    minWidth: '28px',
    textAlign: 'center',
  },
  btnAgregar: {
    flex: 1,
    padding: '14px 12px',
    background: 'linear-gradient(135deg, #C8A84E 0%, #B87333 100%)',
    color: '#0D0D0D',
    border: 'none',
    borderRadius: '14px',
    fontWeight: '800',
    fontSize: '15px',
    cursor: 'pointer',
    minHeight: '48px',
    letterSpacing: '0.2px',
  },
};

export default ProductDetailModal;
