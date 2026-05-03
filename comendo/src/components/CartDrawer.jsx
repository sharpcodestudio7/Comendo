// src/components/CartDrawer.jsx
// Drawer lateral del carrito con selector de método de pago y soporte para
// agregar items a un pedido activo existente en la misma mesa.

import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import useCartStore from '../store/useCartStore';
import { crearPedido, agregarItemsPedido } from '../api/orderService';

const METODOS_PAGO = [
  { id: 'efectivo',  label: 'Efectivo',  emoji: '💵' },
  { id: 'nequi',     label: 'Nequi',     emoji: '💜' },
  { id: 'daviplata', label: 'Daviplata', emoji: '🔴' },
];

const CartDrawer = ({ abierto, onCerrar, mesaId, pedidoActivo, onPedidoCreado }) => {
  const { items, agregarItem, quitarItem, eliminarItem, limpiarCarrito, subtotal } = useCartStore();
  const [enviando, setEnviando]       = useState(false);
  const [errorEnvio, setErrorEnvio]   = useState(null);
  const [metodoPago, setMetodoPago]   = useState(null);
  const navigate = useNavigate();

  // Pre-selecciona el método de pago del pedido activo si ya tiene uno
  useEffect(() => {
    if (pedidoActivo?.metodo_pago) {
      setMetodoPago(pedidoActivo.metodo_pago);
    }
  }, [pedidoActivo]);

  const formatearPrecio = (valor) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor);

  const handleEnviar = async (modo) => {
    // modo: 'nuevo' | 'agregar'
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
      <div style={styles.overlay} onClick={onCerrar} />

      <div style={styles.drawer}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.titulo}>🛒 Tu Pedido</h2>
          <button style={styles.btnCerrar} onClick={onCerrar}>✕</button>
        </div>

        {/* Banner de pedido activo */}
        {hayPedidoActivo && (
          <div style={styles.bannerActivo}>
            <span style={styles.bannerIcono}>⚡</span>
            <div>
              <p style={styles.bannerTitulo}>Esta mesa ya tiene un pedido activo</p>
              <p style={styles.bannerSub}>
                #{pedidoActivo.id_pedido.slice(0, 6).toUpperCase()} · {pedidoActivo.estado_actual}
              </p>
            </div>
          </div>
        )}

        {/* Lista de items */}
        <div style={styles.lista}>
          {items.length === 0 ? (
            <p style={styles.vacio}>Tu carrito está vacío.</p>
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
                    <span style={styles.notasIcon}>📝</span>
                    <span style={styles.notasTexto}>{notas}</span>
                  </div>
                )}

                <div style={styles.itemControles}>
                  <button style={styles.btnContador} onClick={() => quitarItem(producto.id_producto)}>−</button>
                  <span style={styles.cantidad}>{cantidad}</span>
                  <button style={styles.btnContador} onClick={() => agregarItem(producto)}>+</button>
                  <button style={styles.btnEliminar} onClick={() => eliminarItem(producto.id_producto)}>🗑</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer con totales, método de pago y botones */}
        {items.length > 0 && (
          <div style={styles.footer}>
            <div style={styles.filaTotal}>
              <span>Subtotal</span>
              <span>{formatearPrecio(subtotal())}</span>
            </div>
            <div style={styles.filaTotal}>
              <span>Impoconsumo (8%)</span>
              <span>{formatearPrecio(subtotal() * 0.08)}</span>
            </div>
            <div style={{ ...styles.filaTotal, ...styles.filaTotalFinal }}>
              <span>Total</span>
              <span>{formatearPrecio(subtotal() * 1.08)}</span>
            </div>

            {/* Selector de método de pago */}
            <div style={styles.metodoPagoSection}>
              <p style={styles.metodoPagoLabel}>
                {pedidoActivo?.metodo_pago ? 'Método de pago (puedes cambiarlo)' : '¿Cómo vas a pagar?'}
              </p>
              <div style={styles.metodoPagoBotones}>
                {METODOS_PAGO.map((m) => (
                  <button
                    key={m.id}
                    style={{
                      ...styles.metodoPagoBtn,
                      ...(metodoPago === m.id ? styles.metodoPagoBtnActivo : {}),
                    }}
                    onClick={() => setMetodoPago(m.id)}
                  >
                    <span style={styles.metodoPagoEmoji}>{m.emoji}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Botones de acción */}
            {hayPedidoActivo ? (
              <div style={styles.botonesDobles}>
                <button
                  style={{
                    ...styles.btnAgregar,
                    opacity: botonDeshabilitado ? 0.7 : 1,
                    cursor: botonDeshabilitado ? 'not-allowed' : 'pointer',
                  }}
                  onClick={() => handleEnviar('agregar')}
                  disabled={botonDeshabilitado}
                >
                  {enviando ? 'Enviando...' : '➕ Agregar al pedido actual'}
                </button>
                <button
                  style={{
                    ...styles.btnNuevo,
                    opacity: botonDeshabilitado ? 0.7 : 1,
                    cursor: botonDeshabilitado ? 'not-allowed' : 'pointer',
                  }}
                  onClick={() => handleEnviar('nuevo')}
                  disabled={botonDeshabilitado}
                >
                  {enviando ? 'Enviando...' : '🆕 Nuevo pedido'}
                </button>
              </div>
            ) : (
              <button
                style={{
                  ...styles.btnConfirmar,
                  opacity: botonDeshabilitado ? 0.7 : 1,
                  cursor: botonDeshabilitado ? 'not-allowed' : 'pointer',
                }}
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
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100 },
  drawer: {
    position: 'fixed', top: 0, right: 0,
    width: '100%', maxWidth: '420px', height: '100%',
    backgroundColor: '#fff', display: 'flex', flexDirection: 'column',
    zIndex: 101, boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 16px', borderBottom: '1px solid #e0e0e0' },
  titulo: { margin: 0, fontSize: '20px' },
  btnCerrar: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' },

  // Banner pedido activo
  bannerActivo: {
    display: 'flex', alignItems: 'center', gap: '10px',
    backgroundColor: '#fff8e1', borderBottom: '1px solid #ffa726',
    padding: '10px 16px',
  },
  bannerIcono: { fontSize: '20px' },
  bannerTitulo: { margin: 0, fontSize: '13px', fontWeight: '700', color: '#e65100' },
  bannerSub: { margin: 0, fontSize: '12px', color: '#f57c00' },

  // Lista
  lista: { flex: 1, overflowY: 'auto', padding: '16px' },
  vacio: { textAlign: 'center', color: '#999', marginTop: '40px' },
  item: { display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 0', borderBottom: '1px solid #f0f0f0' },
  itemInfo: { display: 'flex', justifyContent: 'space-between' },
  itemNombre: { fontWeight: '600', fontSize: '15px' },
  itemPrecio: { fontWeight: '700', color: '#2e7d32' },

  // Exclusiones
  exclusionesContainer: { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' },
  exclusionesLabel: { fontSize: '12px', fontWeight: '700', color: '#d32f2f' },
  exclusionesChips: { display: 'flex', gap: '4px', flexWrap: 'wrap' },
  exclusionChip: { backgroundColor: '#ffeaea', color: '#d32f2f', border: '1px solid #d32f2f', borderRadius: '12px', padding: '2px 8px', fontSize: '11px', fontWeight: '500' },

  // Notas
  notasContainer: { display: 'flex', alignItems: 'flex-start', gap: '4px', backgroundColor: '#fff8e1', border: '1px solid #ffa726', borderRadius: '8px', padding: '6px 8px' },
  notasIcon: { fontSize: '12px' },
  notasTexto: { fontSize: '12px', color: '#e65100' },

  // Controles
  itemControles: { display: 'flex', alignItems: 'center', gap: '12px' },
  btnContador: { width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #2e7d32', backgroundColor: '#fff', color: '#2e7d32', fontSize: '18px', cursor: 'pointer', fontWeight: '700' },
  cantidad: { fontSize: '16px', fontWeight: '700', minWidth: '20px', textAlign: 'center' },
  btnEliminar: { background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', marginLeft: 'auto' },

  // Footer
  footer: { padding: '16px', borderTop: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', gap: '8px' },
  filaTotal: { display: 'flex', justifyContent: 'space-between', fontSize: '15px' },
  filaTotalFinal: { fontWeight: '700', fontSize: '18px', marginBottom: '4px' },

  // Método de pago
  metodoPagoSection: { marginTop: '4px', marginBottom: '4px' },
  metodoPagoLabel: { margin: '0 0 8px', fontSize: '13px', fontWeight: '700', color: '#333' },
  metodoPagoBotones: { display: 'flex', gap: '8px' },
  metodoPagoBtn: {
    flex: 1, padding: '10px 4px', display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: '4px', border: '2px solid #e0e0e0',
    borderRadius: '10px', backgroundColor: '#f9f9f9',
    cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#555',
    transition: 'all 0.15s',
  },
  metodoPagoBtnActivo: {
    border: '2px solid #2e7d32', backgroundColor: '#e8f5e9', color: '#2e7d32',
  },
  metodoPagoEmoji: { fontSize: '20px' },

  // Botones de acción
  btnConfirmar: { width: '100%', padding: '14px', backgroundColor: '#2e7d32', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '16px' },
  botonesDobles: { display: 'flex', flexDirection: 'column', gap: '8px' },
  btnAgregar: { width: '100%', padding: '13px', backgroundColor: '#2e7d32', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '15px' },
  btnNuevo: { width: '100%', padding: '13px', backgroundColor: '#fff', color: '#2e7d32', border: '2px solid #2e7d32', borderRadius: '10px', fontWeight: '700', fontSize: '15px' },

  error: { color: 'red', textAlign: 'center', fontSize: '13px', margin: '4px 0 0' },
};

export default CartDrawer;
