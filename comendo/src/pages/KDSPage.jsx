// src/pages/KDSPage.jsx
// Vista KDS de cocina con exclusiones de ingredientes y notas del comensal.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabase';
import useKDS from '../hooks/useKDS';

const COLUMNAS = [
  {
    estado: 'Recibido',
    estadoSiguiente: 'Preparando',
    label: 'RECIBIDOS',
    emoji: '🔔',
    colorHeader: '#E53935',
    colorBoton: '#E53935',
    labelBoton: '▶ Iniciar',
  },
  {
    estado: 'Preparando',
    estadoSiguiente: 'Listo',
    label: 'EN PREPARACIÓN',
    emoji: '🍳',
    colorHeader: '#F57C00',
    colorBoton: '#F57C00',
    labelBoton: '✓ Listo',
  },
  {
    estado: 'Listo',
    estadoSiguiente: null,
    label: 'LISTOS',
    emoji: '✅',
    colorHeader: '#2D6A4F',
    colorBoton: null,
    labelBoton: null,
  },
];

const TarjetaPedido = ({ pedido, columna, onCambiarEstado }) => {
  const minutosEspera = Math.floor(
    (new Date() - new Date(pedido.fecha_creacion)) / 60000
  );
  const esperaExcesiva = minutosEspera > 15;

  return (
    <div style={{
      ...styles.tarjeta,
      borderTop: `4px solid ${columna.colorHeader}`,
      boxShadow: esperaExcesiva
        ? '0 0 12px rgba(229, 57, 53, 0.5)'
        : '0 2px 8px rgba(0,0,0,0.12)',
    }}>
      <div style={styles.tarjetaHeader}>
        <span style={styles.mesaLabel}>
          MESA {pedido.mesas?.numero ?? '—'}
        </span>
        <span style={{
          ...styles.tiempoLabel,
          color: esperaExcesiva ? '#E53935' : '#666',
          fontWeight: esperaExcesiva ? '700' : '400',
        }}>
          ⏱ {minutosEspera} min
        </span>
      </div>

      {/* Lista de productos con exclusiones y notas */}
      <div style={styles.productoLista}>
        {pedido.detalle_pedidos.map((detalle, i) => {
          const exclusiones = detalle.exclusiones_pedido || [];
          const notas = detalle.notas;

          return (
            <div key={i} style={styles.productoBloque}>
              {/* Línea del producto */}
              <div style={styles.productoItem}>
                <span style={styles.productoCantidad}>{detalle.cantidad}x</span>
                <span style={styles.productoNombre}>
                  {detalle.productos?.nombre ?? 'Producto'}
                </span>
              </div>

              {/* Exclusiones: bloque rojo visible */}
              {exclusiones.length > 0 && (
                <div style={styles.exclusionBloque}>
                  <span style={styles.exclusionLabel}>⛔ SIN:</span>
                  {exclusiones.map((exc) => (
                    <span key={exc.id_insumo} style={styles.exclusionChip}>
                      {exc.nombre_insumo}
                    </span>
                  ))}
                </div>
              )}

              {/* Notas: bloque naranja */}
              {notas && notas.trim() && (
                <div style={styles.notasBloque}>
                  <span style={styles.notasIcon}>📝</span>
                  <span style={styles.notasTexto}>{notas}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {columna.labelBoton && (
        <button
          style={{ ...styles.botonAccion, backgroundColor: columna.colorBoton }}
          onClick={() => onCambiarEstado(pedido.id_pedido, columna.estadoSiguiente)}
        >
          {columna.labelBoton}
        </button>
      )}
    </div>
  );
};

const KDSPage = () => {
  const navigate = useNavigate();
  const { pedidos, cargando, error, cambiarEstado } = useKDS();
  const [nuevoPedidoAlerta, setNuevoPedidoAlerta] = useState(false);

  useEffect(() => {
    const recibidos = pedidos.filter((p) => p.estado_actual === 'Recibido');
    if (recibidos.length > 0) {
      setNuevoPedidoAlerta(true);
      const timer = setTimeout(() => setNuevoPedidoAlerta(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [pedidos]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (cargando) return <p style={styles.mensaje}>Cargando pedidos...</p>;
  if (error) return <p style={styles.mensaje}>Error: {error}</p>;

  return (
    <div style={styles.pagina}>
      <div style={styles.header}>
        <h1 style={styles.titulo}>🍽 Comendo — Cocina</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={styles.onlineIndicator}>● EN LÍNEA</span>
          <button onClick={handleLogout} style={styles.btnLogout}>
            🚪 Salir
          </button>
        </div>
      </div>

      {nuevoPedidoAlerta && (
        <div style={styles.alertaNuevoPedido}>
          🔔 ¡NUEVO PEDIDO ENTRANTE!
        </div>
      )}

      <div style={styles.tablero}>
        {COLUMNAS.map((columna) => {
          const pedidosColumna = pedidos.filter(
            (p) => p.estado_actual === columna.estado
          );
          return (
            <div key={columna.estado} style={styles.columna}>
              <div style={{
                ...styles.columnaHeader,
                backgroundColor: columna.colorHeader,
              }}>
                <span>{columna.emoji} {columna.label}</span>
                <span style={styles.badge}>{pedidosColumna.length}</span>
              </div>

              <div style={styles.columnaBody}>
                {pedidosColumna.length === 0 ? (
                  <p style={styles.vacio}>Sin pedidos</p>
                ) : (
                  pedidosColumna.map((pedido) => (
                    <TarjetaPedido
                      key={pedido.id_pedido}
                      pedido={pedido}
                      columna={columna}
                      onCambiarEstado={cambiarEstado}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles = {
  pagina: { minHeight: '100vh', backgroundColor: '#1a1a2e', fontFamily: 'Arial, sans-serif', display: 'flex', flexDirection: 'column' },
  mensaje: { color: '#fff', textAlign: 'center', marginTop: '40px', fontSize: '18px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', backgroundColor: '#16213e', borderBottom: '2px solid #2D6A4F' },
  titulo: { margin: 0, color: '#fff', fontSize: '22px' },
  onlineIndicator: { color: '#4CAF50', fontWeight: '700', fontSize: '14px' },
  btnLogout: { padding: '8px 16px', backgroundColor: 'transparent', border: '1px solid #E53935', color: '#E53935', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  alertaNuevoPedido: { backgroundColor: '#E53935', color: '#fff', textAlign: 'center', padding: '12px', fontSize: '16px', fontWeight: '700' },
  tablero: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', padding: '20px', flex: 1 },
  columna: { backgroundColor: '#16213e', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  columnaHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', color: '#fff', fontWeight: '700', fontSize: '15px' },
  badge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: '12px', padding: '2px 10px', fontSize: '14px', fontWeight: '700' },
  columnaBody: { padding: '12px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' },
  vacio: { color: '#555', textAlign: 'center', marginTop: '20px', fontSize: '14px' },

  // Tarjeta de pedido
  tarjeta: { backgroundColor: '#0f3460', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' },
  tarjetaHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  mesaLabel: { color: '#fff', fontWeight: '700', fontSize: '18px' },
  tiempoLabel: { fontSize: '13px' },

  // Productos
  productoLista: { display: 'flex', flexDirection: 'column', gap: '8px' },
  productoBloque: { display: 'flex', flexDirection: 'column', gap: '4px' },
  productoItem: { display: 'flex', gap: '8px', alignItems: 'center' },
  productoCantidad: { color: '#4CAF50', fontWeight: '700', fontSize: '16px', minWidth: '28px' },
  productoNombre: { color: '#e0e0e0', fontSize: '15px' },

  // Exclusiones (bloque rojo para cocina)
  exclusionBloque: {
    display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap',
    backgroundColor: 'rgba(255,23,68,0.15)',
    border: '1px solid #ff1744',
    borderRadius: '6px', padding: '5px 8px', marginLeft: '36px',
  },
  exclusionLabel: {
    color: '#ff1744', fontSize: '12px', fontWeight: '700',
  },
  exclusionChip: {
    color: '#ff8a80', fontSize: '12px', fontWeight: '600',
  },

  // Notas (bloque naranja para cocina)
  notasBloque: {
    display: 'flex', alignItems: 'flex-start', gap: '4px',
    backgroundColor: 'rgba(255,167,38,0.12)',
    border: '1px solid #ffa726',
    borderRadius: '6px', padding: '5px 8px', marginLeft: '36px',
  },
  notasIcon: { fontSize: '12px' },
  notasTexto: { color: '#ffcc80', fontSize: '12px' },

  botonAccion: { width: '100%', padding: '12px', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: '700', fontSize: '15px', cursor: 'pointer', minHeight: '44px' },
};

export default KDSPage;