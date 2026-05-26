import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabase';
import { UtensilsCrossed } from 'lucide-react';
import useKDS from '../hooks/useKDS';

const KDS_CSS = `
  .btn-kds-accion {
    transition: all 0.2s ease;
    min-height: 48px;
  }
  .btn-kds-accion:hover {
    transform: scale(1.02);
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    filter: brightness(1.15);
  }
  .btn-kds-accion:active {
    transform: scale(0.98);
  }
  @keyframes alertBlink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
  .alerta-nuevo-pedido {
    animation: alertBlink 0.5s ease-in-out 3;
  }
  @keyframes urgentPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.3); }
    50% { box-shadow: 0 0 15px 3px rgba(255, 68, 68, 0.2); }
  }
  .tarjeta-urgente {
    animation: urgentPulse 2s ease-in-out infinite;
    border-color: #ff4444 !important;
  }
  .kds-tarjeta {
    transition: all 0.3s ease;
  }
  .kds-tarjeta:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }
  .btn-kds-salir {
    transition: all 0.2s ease;
  }
  .btn-kds-salir:hover {
    background-color: rgba(184, 115, 51, 0.1) !important;
  }
  .cronometro-urgent {
    animation: cronometroParpadeo 1s ease-in-out infinite;
  }
  @keyframes cronometroParpadeo {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.5; }
  }
  @media (max-width: 480px) {
    .kds-tablero {
      grid-template-columns: 1fr !important;
    }
  }
`;

const MINUTOS_VISIBLE_LISTO = 3;

const CuentaAtrasListo = ({ fechaListo }) => {
  const [segundosRestantes, setSegundosRestantes] = useState(() => {
    const transcurridos = (new Date() - new Date(fechaListo)) / 1000;
    return Math.max(0, MINUTOS_VISIBLE_LISTO * 60 - transcurridos);
  });

  useEffect(() => {
    const intervalo = setInterval(() => {
      const transcurridos = (new Date() - new Date(fechaListo)) / 1000;
      setSegundosRestantes(Math.max(0, MINUTOS_VISIBLE_LISTO * 60 - transcurridos));
    }, 1000);
    return () => clearInterval(intervalo);
  }, [fechaListo]);

  const minutos = Math.floor(segundosRestantes / 60);
  const segundos = Math.floor(segundosRestantes % 60);
  const urgente = segundosRestantes <= 30;
  const porcentaje = (segundosRestantes / (MINUTOS_VISIBLE_LISTO * 60)) * 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: urgente ? '#ff4444' : '#4CAF50',
      }}>
        <span style={{ fontWeight: 600 }}>Se oculta en</span>
        <span
          className={urgente ? 'cronometro-urgent' : ''}
          style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '14px', letterSpacing: '1px' }}
        >
          {String(minutos).padStart(2, '0')}:{String(segundos).padStart(2, '0')}
        </span>
      </div>
      {/* Barra de progreso */}
      <div style={{ height: '4px', backgroundColor: '#333', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${porcentaje}%`,
          backgroundColor: urgente ? '#ff4444' : '#4CAF50',
          borderRadius: '4px',
          transition: 'width 1s linear, background-color 0.3s',
        }} />
      </div>
    </div>
  );
};

const COLUMNAS = [
  {
    estado: 'Recibido',
    estadoSiguiente: 'Preparando',
    label: 'RECIBIDOS',
    colorHeader: '#8B1A1A',
    colorBoton: '#8B1A1A',
    labelBoton: 'Iniciar',
  },
  {
    estado: 'Preparando',
    estadoSiguiente: 'Listo',
    label: 'EN PREPARACIÓN',
    colorHeader: '#7B5B00',
    colorBoton: '#1B5E20',
    labelBoton: 'Listo',
  },
  {
    estado: 'Listo',
    estadoSiguiente: null,
    label: 'LISTOS',
    colorHeader: '#1B5E20',
    colorBoton: null,
    labelBoton: null,
  },
];

const CronometroPedido = ({ fechaCreacion }) => {
  const [tiempo, setTiempo] = useState('');
  const [nivel, setNivel] = useState('normal');

  useEffect(() => {
    const calcular = () => {
      const diffMs = new Date() - new Date(fechaCreacion);
      const minutos = Math.floor(diffMs / 60000);
      const segundos = Math.floor((diffMs % 60000) / 1000);
      setTiempo(`${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`);
      setNivel(minutos >= 15 ? 'urgent' : minutos >= 10 ? 'warning' : 'normal');
    };
    calcular();
    const intervalo = setInterval(calcular, 1000);
    return () => clearInterval(intervalo);
  }, [fechaCreacion]);

  const colores = { normal: '#B87333', warning: '#FFB300', urgent: '#ff4444' };

  return (
    <div
      className={nivel === 'urgent' ? 'cronometro-urgent' : ''}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '14px',
        fontWeight: '700',
        fontFamily: 'monospace',
        color: colores[nivel],
        letterSpacing: '1px',
      }}
    >
      <span style={{ fontSize: '12px' }}>⏱</span>
      {tiempo}
    </div>
  );
};

const TarjetaPedido = ({ pedido, columna, onCambiarEstado }) => {
  const minutosEspera = Math.floor(
    (new Date() - new Date(pedido.fecha_creacion)) / 60000
  );
  const esUrgente = minutosEspera > 15;

  return (
    <div
      className={`kds-tarjeta${esUrgente ? ' tarjeta-urgente' : ''}`}
      style={{
        ...styles.tarjeta,
        borderTop: `3px solid ${columna.colorHeader}`,
      }}
    >
      <div style={styles.tarjetaHeader}>
        <span style={styles.mesaLabel}>
          MESA {pedido.mesas?.numero ?? '—'}
        </span>
        <CronometroPedido fechaCreacion={pedido.fecha_creacion} />
      </div>

      <div style={styles.productoLista}>
        {!(pedido.detalle_pedidos?.length) && (
          <p style={{ color: '#666', fontSize: '13px', fontStyle: 'italic' }}>Sin detalles — verifica permisos RLS</p>
        )}
        {(pedido.detalle_pedidos ?? []).map((detalle, i) => {
          const exclusiones = detalle.exclusiones_pedido || [];
          const notas = detalle.notas;

          return (
            <div key={i} style={styles.productoBloque}>
              <div style={styles.productoItem}>
                <span style={styles.productoCantidad}>{detalle.cantidad}x</span>
                <span style={styles.productoNombre}>
                  {detalle.productos?.nombre ?? 'Producto'}
                </span>
              </div>

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

      {pedido.estado_actual === 'Listo' && (
        <CuentaAtrasListo
          fechaListo={pedido.fecha_listo_local ?? pedido.fecha_creacion}
        />
      )}

      {pedido.mesero?.nombre && (
        <div style={styles.meseroBloque}>
          <span style={styles.meseroIcon}>🛎</span>
          <span style={styles.meseroNombre}>{pedido.mesero.nombre}</span>
        </div>
      )}

      {columna.labelBoton && (
        <button
          className="btn-kds-accion"
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

  if (cargando) return (
    <div style={styles.paginaCarga}>
      <p style={styles.mensajeCarga}>Cargando pedidos...</p>
    </div>
  );

  if (error) return (
    <div style={styles.paginaCarga}>
      <p style={styles.mensajeCarga}>Error: {error}</p>
    </div>
  );

  return (
    <>
      <style>{KDS_CSS}</style>

      <div style={styles.pagina}>
        <header style={styles.header}>
          <div style={styles.headerLogo}>
            <UtensilsCrossed size={28} color="#B87333" />
            <h1 style={styles.titulo}>Comendo — Cocina</h1>
          </div>
          <div style={styles.headerAcciones}>
            <span style={styles.onlineIndicator}>
              <span style={styles.onlineDot} />
              EN LÍNEA
            </span>
            <button className="btn-kds-salir" onClick={handleLogout} style={styles.btnLogout}>
              Salir
            </button>
          </div>
        </header>

        {nuevoPedidoAlerta && (
          <div className="alerta-nuevo-pedido" style={styles.alertaNuevoPedido}>
            🔔 ¡NUEVO PEDIDO ENTRANTE!
          </div>
        )}

        <div className="kds-tablero" style={styles.tablero}>
          {COLUMNAS.map((columna) => {
            const pedidosColumna = pedidos.filter(
              (p) => p.estado_actual === columna.estado
            );
            return (
              <div key={columna.estado} style={styles.columna}>
                <div style={{ ...styles.columnaHeader, backgroundColor: columna.colorHeader }}>
                  <span style={styles.columnaLabel}>{columna.label}</span>
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
    </>
  );
};

const styles = {
  pagina: {
    minHeight: '100vh',
    backgroundColor: '#0D0D0D',
    fontFamily: 'sans-serif',
    display: 'flex',
    flexDirection: 'column',
  },
  paginaCarga: {
    minHeight: '100vh',
    backgroundColor: '#0D0D0D',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mensajeCarga: {
    color: '#666',
    fontSize: '18px',
  },

  // Header
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 24px',
    backgroundColor: '#1A1A1A',
    borderBottom: '1px solid #333',
    flexShrink: 0,
  },
  headerLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  titulo: {
    margin: 0,
    color: '#FFFFFF',
    fontSize: '20px',
    fontWeight: 600,
  },
  headerAcciones: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  onlineIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#4CAF50',
    fontWeight: 700,
    fontSize: '12px',
  },
  onlineDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#4CAF50',
    display: 'inline-block',
  },
  btnLogout: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: '1px solid #B87333',
    color: '#B87333',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
  },

  // Alerta
  alertaNuevoPedido: {
    backgroundColor: '#8B1A1A',
    color: '#FFFFFF',
    textAlign: 'center',
    padding: '14px',
    fontSize: '16px',
    fontWeight: 700,
    flexShrink: 0,
  },

  // Tablero
  tablero: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '16px',
    padding: '20px',
    flex: 1,
    alignItems: 'start',
  },
  columna: {
    backgroundColor: '#1A1A1A',
    borderRadius: '12px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  columnaHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: '14px',
    flexShrink: 0,
  },
  columnaLabel: {
    letterSpacing: '0.5px',
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: '12px',
    padding: '2px 10px',
    fontSize: '14px',
    fontWeight: 700,
  },
  columnaBody: {
    padding: '12px',
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    minHeight: '120px',
  },
  vacio: {
    color: '#444',
    textAlign: 'center',
    marginTop: '20px',
    fontSize: '14px',
    fontStyle: 'italic',
  },

  // Tarjeta
  tarjeta: {
    backgroundColor: '#2A2A2A',
    borderRadius: '12px',
    border: '1px solid #333',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  tarjetaHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mesaLabel: {
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: '20px',
  },
  tiempoLabel: {
    fontSize: '13px',
  },

  // Productos
  productoLista: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  productoBloque: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  productoItem: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  productoCantidad: {
    color: '#B87333',
    fontWeight: 700,
    fontSize: '16px',
    minWidth: '28px',
  },
  productoNombre: {
    color: '#E0E0E0',
    fontSize: '15px',
  },

  // Exclusiones
  exclusionBloque: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
    backgroundColor: 'rgba(139, 26, 26, 0.2)',
    border: '1px solid #8B1A1A',
    borderRadius: '8px',
    padding: '5px 8px',
    marginLeft: '36px',
  },
  exclusionLabel: {
    color: '#ff6b6b',
    fontSize: '12px',
    fontWeight: 700,
  },
  exclusionChip: {
    color: '#ff6b6b',
    fontSize: '12px',
    fontWeight: 600,
  },

  // Notas
  notasBloque: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '4px',
    backgroundColor: 'rgba(184, 115, 51, 0.15)',
    border: '1px solid rgba(184, 115, 51, 0.4)',
    borderRadius: '8px',
    padding: '5px 8px',
    marginLeft: '36px',
  },
  notasIcon: { fontSize: '12px' },
  notasTexto: {
    color: '#E8D5A0',
    fontSize: '12px',
  },

  // Mesero
  meseroBloque: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'rgba(27, 94, 32, 0.2)',
    border: '1px solid #1B5E20',
    borderRadius: '6px',
    padding: '5px 10px',
  },
  meseroIcon: { fontSize: '14px' },
  meseroNombre: {
    color: '#4CAF50',
    fontSize: '13px',
    fontWeight: 700,
  },

  // Botón acción
  botonAccion: {
    width: '100%',
    padding: '12px',
    border: 'none',
    borderRadius: '10px',
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: '15px',
    cursor: 'pointer',
  },
};

export default KDSPage;
