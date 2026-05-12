import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import useCartStore from '../store/useCartStore';
import { crearPedido, agregarItemsPedido } from '../api/orderService';

const METODOS_PAGO = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'tarjeta',  label: 'Tarjeta'  },
];

const CartDrawer = ({ abierto, onCerrar, mesaId, pedidoActivo, onPedidoCreado }) => {
  const { items, agregarItem, quitarItem, eliminarItem, limpiarCarrito, subtotal } = useCartStore();
  const [enviando, setEnviando]     = useState(false);
  const [errorEnvio, setErrorEnvio] = useState(null);
  const [metodoPago, setMetodoPago] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const mp = pedidoActivo?.metodo_pago;
    if (mp && METODOS_PAGO.some((m) => m.id === mp)) {
      setMetodoPago(mp);
    }
  }, [pedidoActivo]);

  const formatearPrecio = (valor) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor);

  const handleEnviar = async (modo) => {
    if (items.length === 0) return;
    if (!metodoPago) {
      setErrorEnvio('Selecciona un método de pago antes de continuar.');
      return;
    }
    try {
      setEnviando(true);
      setErrorEnvio(null);
      let pedido;
      if (modo === 'agregar' && pedidoActivo) {
        pedido = await agregarItemsPedido(pedidoActivo.id_pedido, items, metodoPago);
      } else {
        pedido = await crearPedido(mesaId, items, metodoPago);
      }
      limpiarCarrito();
      if (onPedidoCreado) onPedidoCreado();
      onCerrar();
      navigate(`/pedido/${pedido.id_pedido}`);
    } catch (error) {
      console.error('Error al confirmar pedido:', error);
      setErrorEnvio('No pudimos enviar tu pedido. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  if (!abierto) return null;

  const hayPedidoActivo = !!pedidoActivo;
  const botonDeshabilitado = enviando || items.length === 0;

  return (
    <>
      <style>{`
        .btn-delete-cart {
          transition: all 0.3s ease !important;
          opacity: 0.4;
        }
        .btn-delete-cart:hover {
          opacity: 1;
          color: #ff4444 !important;
          background-color: rgba(255, 68, 68, 0.1) !important;
          border-radius: 8px;
          transform: rotate(-8deg) scale(1.1);
        }
        .btn-delete-cart:active {
          transform: rotate(0deg) scale(0.95);
          color: #ff0000 !important;
        }
        .btn-metodo-pago {
          transition: all 0.3s ease !important;
          position: relative;
          overflow: hidden;
        }
        .btn-metodo-pago:hover {
          background-color: rgba(184, 115, 51, 0.15) !important;
          border-color: #B87333 !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 15px rgba(184, 115, 51, 0.2);
        }
        .btn-metodo-pago:active {
          transform: translateY(0);
          box-shadow: none;
        }
        .btn-confirmar-pedido {
          transition: all 0.3s ease !important;
          position: relative;
          overflow: hidden;
        }
        .btn-confirmar-pedido:hover {
          background-color: #D4922A !important;
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(184, 115, 51, 0.5);
        }
        .btn-confirmar-pedido:active {
          transform: translateY(0);
          box-shadow: 0 2px 10px rgba(184, 115, 51, 0.3);
        }
        .btn-confirmar-pedido::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%);
          transform: translateX(-100%);
          transition: transform 0.6s ease;
        }
        .btn-confirmar-pedido:hover::after {
          transform: translateX(100%);
        }
        .btn-qty-cart {
          transition: all 0.2s ease !important;
        }
        .btn-qty-cart:hover {
          transform: scale(1.1);
          box-shadow: 0 0 10px rgba(184, 115, 51, 0.3);
        }
        .btn-qty-cart:active {
          transform: scale(0.9);
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0);    }
        }
        @keyframes fadeInOverlay {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .cart-drawer-slide {
          animation: slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .cart-overlay-fade {
          animation: fadeInOverlay 0.25s ease-out;
        }
      `}</style>

      <div className="cart-overlay-fade" style={styles.overlay} onClick={onCerrar} />

      <div className="cart-drawer-slide" style={styles.drawer}>
        {/* Indicador de swipe */}
        <div style={styles.swipeIndicador} />

        {/* Header fijo */}
        <div style={styles.header}>
          <h2 style={styles.titulo}>Tu Pedido</h2>
          <button style={styles.btnCerrar} onClick={onCerrar}>✕</button>
        </div>

        {/* Banner pedido activo */}
        {hayPedidoActivo && (
          <div style={styles.bannerActivo}>
            <span style={{ fontSize: '18px' }}>⚡</span>
            <div>
              <p style={styles.bannerTitulo}>Mesa con pedido activo</p>
              <p style={styles.bannerSub}>Estado: {pedidoActivo.estado_actual}</p>
            </div>
          </div>
        )}

        {/* Lista con scroll independiente */}
        <div style={styles.lista}>
          {items.length === 0 ? (
            <div style={styles.vacioContainer}>
              <span style={{ fontSize: '48px', opacity: 0.2 }}>🛍</span>
              <p style={styles.vacio}>Tu carrito está vacío</p>
              <p style={styles.vacioSub}>Agrega productos del menú para comenzar</p>
            </div>
          ) : (
            items.map(({ producto, cantidad, exclusiones, notas }) => (
              <div key={producto.id_producto} style={styles.item}>
                <div style={styles.itemInfo}>
                  <span style={styles.itemNombre}>{producto.nombre}</span>
                  <span style={styles.itemPrecio}>{formatearPrecio(producto.precio * cantidad)}</span>
                </div>

                {exclusiones && exclusiones.length > 0 && (
                  <div style={styles.exclusionesContainer}>
                    <span style={styles.exclusionesLabel}>SIN:</span>
                    <div style={styles.exclusionesChips}>
                      {exclusiones.map((exc) => (
                        <span key={exc.id_insumo} style={styles.exclusionChip}>✕ {exc.nombre}</span>
                      ))}
                    </div>
                  </div>
                )}

                {notas && notas.trim() && (
                  <div style={styles.notasContainer}>
                    <span style={{ fontSize: '12px' }}>📝</span>
                    <span style={styles.notasTexto}>{notas}</span>
                  </div>
                )}

                <div style={styles.itemControles}>
                  <button className="btn-qty-cart" style={styles.btnContador} onClick={() => quitarItem(producto.id_producto)}>−</button>
                  <span style={styles.cantidad}>{cantidad}</span>
                  <button className="btn-qty-cart" style={styles.btnContador} onClick={() => agregarItem(producto)}>+</button>
                  <button className="btn-delete-cart" style={styles.btnEliminar} onClick={() => eliminarItem(producto.id_producto)}>🗑</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer fijo con totales y acciones */}
        {items.length > 0 && (
          <div style={styles.footer}>
            <div style={styles.filaTotal}>
              <span style={styles.filaTotalLabel}>Subtotal</span>
              <span style={styles.filaTotalValor}>{formatearPrecio(subtotal())}</span>
            </div>
            <div style={styles.filaTotal}>
              <span style={styles.filaTotalLabel}>Impoconsumo (8%)</span>
              <span style={styles.filaTotalValor}>{formatearPrecio(subtotal() * 0.08)}</span>
            </div>
            <div style={{ ...styles.filaTotal, ...styles.filaTotalFinal }}>
              <span style={styles.filaTotalFinalLabel}>Total</span>
              <span style={styles.filaTotalFinalValor}>{formatearPrecio(subtotal() * 1.08)}</span>
            </div>

            {/* Método de pago */}
            <div style={styles.metodoPagoSection}>
              <p style={styles.metodoPagoLabel}>
                {pedidoActivo?.metodo_pago ? 'Método de pago (puedes cambiarlo)' : '¿Cómo vas a pagar?'}
              </p>
              <div style={styles.metodoPagoBotones}>
                {METODOS_PAGO.map((m) => {
                  const activo = metodoPago === m.id;
                  return (
                    <button
                      key={m.id}
                      className="btn-metodo-pago"
                      style={{ ...styles.metodoPagoBtn, ...(activo ? styles.metodoPagoBtnActivo : {}) }}
                      onClick={() => setMetodoPago(m.id)}
                    >
                      <span style={activo ? styles.metodoPagoCheck : styles.metodoPagoCheckOculto}>✓</span>
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Botones de acción */}
            {hayPedidoActivo ? (
              <div style={styles.botonesDobles}>
                <button
                  style={{ ...styles.btnAgregar, opacity: botonDeshabilitado ? 0.6 : 1, cursor: botonDeshabilitado ? 'not-allowed' : 'pointer' }}
                  onClick={() => handleEnviar('agregar')}
                  disabled={botonDeshabilitado}
                >
                  {enviando ? 'Enviando...' : 'Agregar al pedido actual'}
                </button>
                <button
                  style={{ ...styles.btnNuevo, opacity: botonDeshabilitado ? 0.6 : 1, cursor: botonDeshabilitado ? 'not-allowed' : 'pointer' }}
                  onClick={() => handleEnviar('nuevo')}
                  disabled={botonDeshabilitado}
                >
                  {enviando ? 'Enviando...' : 'Nuevo pedido'}
                </button>
              </div>
            ) : (
              <button
                className="btn-confirmar-pedido"
                style={{ ...styles.btnConfirmar, opacity: botonDeshabilitado ? 0.6 : 1, cursor: botonDeshabilitado ? 'not-allowed' : 'pointer' }}
                onClick={() => handleEnviar('nuevo')}
                disabled={botonDeshabilitado}
              >
                {enviando ? 'Enviando a cocina...' : 'Confirmar y Enviar a Cocina'}
              </button>
            )}

            {errorEnvio && <p style={styles.error}>{errorEnvio}</p>}
          </div>
        )}
      </div>
    </>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 100,
  },
  drawer: {
    position: 'fixed',
    top: 0,
    right: 0,
    width: '100%',
    maxWidth: '480px',
    height: '100vh',
    backgroundColor: '#0D0D0D',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 101,
    boxShadow: '-4px 0 30px rgba(0,0,0,0.6)',
  },
  swipeIndicador: {
    width: '40px',
    height: '4px',
    backgroundColor: '#666',
    borderRadius: '2px',
    margin: '12px auto 0',
    flexShrink: 0,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px 16px',
    borderBottom: '1px solid #333',
    flexShrink: 0,
  },
  titulo: { margin: 0, fontSize: '20px', fontWeight: '700', color: '#FFFFFF' },
  btnCerrar: {
    background: '#1A1A1A',
    border: '1px solid #333',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#999',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bannerActivo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: 'rgba(184,115,51,0.08)',
    borderBottom: '1px solid rgba(184,115,51,0.25)',
    padding: '12px 16px',
    flexShrink: 0,
  },
  bannerTitulo: { margin: 0, fontSize: '13px', fontWeight: '700', color: '#B87333' },
  bannerSub: { margin: 0, fontSize: '12px', color: '#d4a06a', opacity: 0.9 },
  lista: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    WebkitOverflowScrolling: 'touch',
  },
  vacioContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: '60px',
    gap: '8px',
  },
  vacio: { textAlign: 'center', color: '#FFFFFF', fontSize: '16px', fontWeight: '600', margin: 0 },
  vacioSub: { textAlign: 'center', color: '#666', fontSize: '13px', margin: 0 },
  item: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '14px',
    marginBottom: '10px',
    backgroundColor: '#1A1A1A',
    borderRadius: '12px',
  },
  itemInfo: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' },
  itemNombre: { fontWeight: '600', fontSize: '15px', color: '#FFFFFF' },
  itemPrecio: { fontWeight: '700', color: '#B87333', flexShrink: 0, fontSize: '15px' },
  exclusionesContainer: { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' },
  exclusionesLabel: { fontSize: '11px', fontWeight: '700', color: '#ef5350' },
  exclusionesChips: { display: 'flex', gap: '4px', flexWrap: 'wrap' },
  exclusionChip: {
    backgroundColor: 'rgba(211,47,47,0.1)',
    color: '#ef5350',
    border: '1px solid rgba(211,47,47,0.4)',
    borderRadius: '12px',
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: '500',
  },
  notasContainer: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '6px',
    backgroundColor: 'rgba(184,115,51,0.08)',
    border: '1px solid rgba(184,115,51,0.25)',
    borderRadius: '8px',
    padding: '7px 10px',
  },
  notasTexto: { fontSize: '12px', color: '#d4a06a' },
  itemControles: { display: 'flex', alignItems: 'center', gap: '12px' },
  btnContador: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    border: '1.5px solid #B87333',
    backgroundColor: 'transparent',
    color: '#B87333',
    fontSize: '18px',
    cursor: 'pointer',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  cantidad: { fontSize: '16px', fontWeight: '700', color: '#FFFFFF', minWidth: '20px', textAlign: 'center' },
  btnEliminar: { background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', marginLeft: 'auto', padding: '8px', borderRadius: '8px' },
  footer: {
    paddingTop: '14px',
    paddingLeft: '16px',
    paddingRight: '16px',
    paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
    borderTop: '1px solid #333',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flexShrink: 0,
    backgroundColor: '#0D0D0D',
  },
  filaTotal: { display: 'flex', justifyContent: 'space-between' },
  filaTotalLabel: { fontSize: '14px', color: '#999' },
  filaTotalValor: { fontSize: '14px', color: '#999' },
  filaTotalFinal: { marginTop: '4px', paddingTop: '8px', borderTop: '1px solid #333' },
  filaTotalFinalLabel: { fontSize: '17px', fontWeight: '700', color: '#FFFFFF' },
  filaTotalFinalValor: { fontSize: '17px', fontWeight: '700', color: '#B87333' },
  metodoPagoSection: { marginTop: '4px' },
  metodoPagoLabel: { margin: '0 0 8px', fontSize: '13px', fontWeight: '500', color: '#999' },
  metodoPagoBotones: { display: 'flex', gap: '12px' },
  metodoPagoBtn: {
    flex: 1,
    padding: '14px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    border: '1px solid #333',
    borderRadius: '10px',
    backgroundColor: '#2A2A2A',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#FFFFFF',
    minHeight: '48px',
  },
  metodoPagoBtnActivo: {
    border: '1.5px solid #B87333',
    backgroundColor: 'rgba(184,115,51,0.1)',
  },
  metodoPagoCheck: {
    fontSize: '13px',
    color: '#B87333',
    fontWeight: '700',
  },
  metodoPagoCheckOculto: {
    fontSize: '13px',
    color: 'transparent',
    fontWeight: '700',
  },
  btnConfirmar: {
    width: '100%',
    padding: '15px',
    backgroundColor: '#B87333',
    color: '#000000',
    border: 'none',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '16px',
    marginTop: '4px',
  },
  botonesDobles: { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' },
  btnAgregar: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#B87333',
    color: '#000000',
    border: 'none',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '15px',
  },
  btnNuevo: {
    width: '100%',
    padding: '14px',
    backgroundColor: 'transparent',
    color: '#B87333',
    border: '1.5px solid #B87333',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '15px',
    cursor: 'pointer',
  },
  error: { color: '#ef5350', textAlign: 'center', fontSize: '13px', margin: '4px 0 0' },
};

export default CartDrawer;
