// src/components/CartDrawer.jsx
// Drawer lateral del carrito con visualización de exclusiones y notas por producto.

import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import useCartStore from '../store/useCartStore';
import { crearPedido } from '../api/orderService';

const CartDrawer = ({ abierto, onCerrar, mesaId }) => {
  const { items, agregarItem, quitarItem, eliminarItem, limpiarCarrito, subtotal } = useCartStore();
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState(null);
  const navigate = useNavigate();

  const formatearPrecio = (valor) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(valor);

  const handleConfirmar = async () => {
    if (items.length === 0) return;
    try {
      setEnviando(true);
      setErrorEnvio(null);

      const pedido = await crearPedido(mesaId, items);
      console.log('✅ Pedido creado:', pedido);

      limpiarCarrito();
      onCerrar();
      navigate(`/pedido/${pedido.id_pedido}`);
    } catch (error) {
      console.error('❌ Error al confirmar pedido:', error);
      setErrorEnvio('No pudimos enviar tu pedido. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  if (!abierto) return null;

  return (
    <>
      <div style={styles.overlay} onClick={onCerrar} />

      <div style={styles.drawer}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.titulo}>🛒 Tu Pedido</h2>
          <button style={styles.btnCerrar} onClick={onCerrar}>✕</button>
        </div>

        {/* Lista de items */}
        <div style={styles.lista}>
          {items.length === 0 ? (
            <p style={styles.vacio}>Tu carrito está vacío.</p>
          ) : (
            items.map(({ producto, cantidad, exclusiones, notas }) => (
              <div key={producto.id_producto} style={styles.item}>
                {/* Nombre y precio */}
                <div style={styles.itemInfo}>
                  <span style={styles.itemNombre}>{producto.nombre}</span>
                  <span style={styles.itemPrecio}>
                    {formatearPrecio(producto.precio * cantidad)}
                  </span>
                </div>

                {/* Exclusiones: tags rojos */}
                {exclusiones && exclusiones.length > 0 && (
                  <div style={styles.exclusionesContainer}>
                    <span style={styles.exclusionesLabel}>SIN:</span>
                    <div style={styles.exclusionesChips}>
                      {exclusiones.map((exc) => (
                        <span key={exc.id_insumo} style={styles.exclusionChip}>
                          ✕ {exc.nombre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notas: tag naranja */}
                {notas && notas.trim() && (
                  <div style={styles.notasContainer}>
                    <span style={styles.notasIcon}>📝</span>
                    <span style={styles.notasTexto}>{notas}</span>
                  </div>
                )}

                {/* Controles de cantidad */}
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

        {/* Footer con totales */}
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

            <button
              style={{
                ...styles.btnConfirmar,
                opacity: enviando ? 0.7 : 1,
                cursor: enviando ? 'not-allowed' : 'pointer',
              }}
              onClick={handleConfirmar}
              disabled={enviando}
            >
              {enviando ? 'Enviando a cocina...' : 'Confirmar y Enviar a Cocina'}
            </button>

            {errorEnvio && (
              <p style={styles.error}>{errorEnvio}</p>
            )}
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
  lista: { flex: 1, overflowY: 'auto', padding: '16px' },
  vacio: { textAlign: 'center', color: '#999', marginTop: '40px' },

  // Items
  item: { display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 0', borderBottom: '1px solid #f0f0f0' },
  itemInfo: { display: 'flex', justifyContent: 'space-between' },
  itemNombre: { fontWeight: '600', fontSize: '15px' },
  itemPrecio: { fontWeight: '700', color: '#2e7d32' },

  // Exclusiones
  exclusionesContainer: {
    display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap',
  },
  exclusionesLabel: {
    fontSize: '12px', fontWeight: '700', color: '#d32f2f',
  },
  exclusionesChips: {
    display: 'flex', gap: '4px', flexWrap: 'wrap',
  },
  exclusionChip: {
    backgroundColor: '#ffeaea', color: '#d32f2f',
    border: '1px solid #d32f2f', borderRadius: '12px',
    padding: '2px 8px', fontSize: '11px', fontWeight: '500',
  },

  // Notas
  notasContainer: {
    display: 'flex', alignItems: 'flex-start', gap: '4px',
    backgroundColor: '#fff8e1', border: '1px solid #ffa726',
    borderRadius: '8px', padding: '6px 8px',
  },
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
  filaTotalFinal: { fontWeight: '700', fontSize: '18px', marginBottom: '8px' },
  btnConfirmar: { width: '100%', padding: '14px', backgroundColor: '#2e7d32', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '16px' },
  error: { color: 'red', textAlign: 'center', fontSize: '13px', margin: '4px 0 0' },
};

export default CartDrawer;