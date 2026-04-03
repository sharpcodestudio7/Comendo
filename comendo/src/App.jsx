// src/pages/KDSPage.jsx
// Tablero de cocina estilo Kanban — Figura 11 del PDF
// Muestra pedidos en 3 columnas según su estado

import useKDS from './hooks/useKDS';

// Configuración visual de cada columna
const COLUMNAS = [
  {
    estado: 'Recibido',
    estadoSiguiente: 'Preparando',
    label: 'RECIBIDOS',
    emoji: '🔔',
    colorHeader: '#E53935',     // Rojo — requiere atención inmediata
    colorBoton: '#E53935',
    labelBoton: '▶ Iniciar',
  },
  {
    estado: 'Preparando',
    estadoSiguiente: 'Listo',
    label: 'EN PREPARACIÓN',
    emoji: '🍳',
    colorHeader: '#F57C00',     // Naranja — en progreso
    colorBoton: '#F57C00',
    labelBoton: '✓ Listo',
  },
  {
    estado: 'Listo',
    estadoSiguiente: null,      // No hay siguiente estado en el KDS
    label: 'LISTOS',
    emoji: '✅',
    colorHeader: '#2D6A4F',     // Verde — completado
    colorBoton: null,
    labelBoton: null,
  },
];

// ── Componente de tarjeta individual de pedido ────────────────────────────
const TarjetaPedido = ({ pedido, columna, onCambiarEstado }) => {
  // Calcula cuántos minutos lleva el pedido en este estado
  const minutosEspera = Math.floor(
    (new Date() - new Date(pedido.fecha_creacion)) / 60000
  );
  const esperaExcesiva = minutosEspera > 15; // Alerta si supera 15 minutos

  return (
    <div style={{
      ...styles.tarjeta,
      borderTop: `4px solid ${columna.colorHeader}`,
      // Pulso visual si el tiempo de espera es excesivo
      boxShadow: esperaExcesiva
        ? '0 0 12px rgba(229, 57, 53, 0.5)'
        : '0 2px 8px rgba(0,0,0,0.12)',
    }}>

      {/* Header de la tarjeta */}
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

      {/* Lista de productos */}
      <div style={styles.productoLista}>
        {pedido.detalle_pedidos.map((detalle, i) => (
          <div key={i} style={styles.productoItem}>
            <span style={styles.productoCantidad}>
              {detalle.cantidad}x
            </span>
            <span style={styles.productoNombre}>
              {detalle.productos?.nombre ?? 'Producto'}
            </span>
          </div>
        ))}
      </div>

      {/* Botón de acción — no se muestra en la columna "Listos" */}
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

// ── Componente principal KDSPage ──────────────────────────────────────────
const KDSPage = () => {
  const { pedidos, cargando, error, cambiarEstado } = useKDS();

  if (cargando) return <p style={styles.mensaje}>Cargando pedidos...</p>;
  if (error)    return <p style={styles.mensaje}>Error: {error}</p>;

  return (
    <div style={styles.pagina}>

      {/* Header del KDS */}
      <div style={styles.header}>
        <h1 style={styles.titulo}>🍽 Comendo — Cocina</h1>
        <span style={styles.onlineIndicator}>● EN LÍNEA</span>
      </div>

      {/* Tablero Kanban — 3 columnas */}
      <div style={styles.tablero}>
        {COLUMNAS.map((columna) => {
          // Filtra los pedidos que pertenecen a esta columna
          const pedidosColumna = pedidos.filter(
            (p) => p.estado_actual === columna.estado
          );

          return (
            <div key={columna.estado} style={styles.columna}>

              {/* Header de la columna */}
              <div style={{
                ...styles.columnaHeader,
                backgroundColor: columna.colorHeader,
              }}>
                <span>{columna.emoji} {columna.label}</span>
                {/* Badge con cantidad de pedidos */}
                <span style={styles.badge}>{pedidosColumna.length}</span>
              </div>

              {/* Tarjetas de pedidos */}
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
  pagina: {
    minHeight: '100vh',
    backgroundColor: '#1a1a2e',   // Fondo oscuro — entorno de cocina
    fontFamily: 'Arial, sans-serif',
    display: 'flex',
    flexDirection: 'column',
  },
  mensaje: { color: '#fff', textAlign: 'center', marginTop: '40px', fontSize: '18px' },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: '#16213e',
    borderBottom: '2px solid #2D6A4F',
  },
  titulo: { margin: 0, color: '#fff', fontSize: '22px' },
  onlineIndicator: { color: '#4CAF50', fontWeight: '700', fontSize: '14px' },
  tablero: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '16px',
    padding: '20px',
    flex: 1,
  },
  columna: {
    backgroundColor: '#16213e',
    borderRadius: '12px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  columnaHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 16px',
    color: '#fff', fontWeight: '700', fontSize: '15px',
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: '12px',
    padding: '2px 10px',
    fontSize: '14px',
    fontWeight: '700',
  },
  columnaBody: { padding: '12px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' },
  vacio: { color: '#555', textAlign: 'center', marginTop: '20px', fontSize: '14px' },
  tarjeta: {
    backgroundColor: '#0f3460',
    borderRadius: '10px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  tarjetaHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  mesaLabel: { color: '#fff', fontWeight: '700', fontSize: '18px' },
  tiempoLabel: { fontSize: '13px' },
  productoLista: { display: 'flex', flexDirection: 'column', gap: '4px' },
  productoItem: { display: 'flex', gap: '8px', alignItems: 'center' },
  productoCantidad: { color: '#4CAF50', fontWeight: '700', fontSize: '16px', minWidth: '28px' },
  productoNombre: { color: '#e0e0e0', fontSize: '15px' },
  botonAccion: {
    width: '100%', padding: '12px',
    border: 'none', borderRadius: '8px',
    color: '#fff', fontWeight: '700', fontSize: '15px',
    cursor: 'pointer',
    minHeight: '44px',   // Cumple el mínimo de accesibilidad del PDF
  },
};

export default KDSPage;