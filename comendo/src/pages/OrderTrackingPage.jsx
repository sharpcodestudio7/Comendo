import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabase';

const TRACKING_CSS = `
  @keyframes pulseRing {
    0%   { box-shadow: 0 0 0 0 rgba(184, 115, 51, 0.4); }
    70%  { box-shadow: 0 0 0 15px rgba(184, 115, 51, 0); }
    100% { box-shadow: 0 0 0 0 rgba(184, 115, 51, 0); }
  }
  @keyframes glowPulse {
    0%, 100% { opacity: 0.7; }
    50%       { opacity: 1; }
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmerOrder {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  .estado-activo-circulo {
    animation: pulseRing 2s ease-out infinite;
  }
  .estado-completado-circulo {
    animation: glowPulse 2s ease-in-out infinite;
  }
  .tracking-container {
    animation: fadeInUp 0.5s ease-out;
  }
  .orden-numero {
    background: linear-gradient(90deg, #B87333, #D4A017, #B87333);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmerOrder 3s linear infinite;
    display: inline-block;
  }
  .btn-agregar-mas {
    transition: all 0.3s ease;
  }
  .btn-agregar-mas:hover {
    background-color: rgba(184, 115, 51, 0.1) !important;
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(184, 115, 51, 0.25);
  }
  .btn-agregar-mas:active {
    transform: translateY(0);
  }
  .timeline-line-active {
    background: linear-gradient(to bottom, #B87333, #D4922A) !important;
    transition: height 0.8s ease;
  }
  .btn-cuenta:hover {
    background-color: #D4922A !important;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(184, 115, 51, 0.4);
    transition: all 0.3s ease;
  }
  .btn-cuenta:active {
    transform: translateY(0);
  }
`;

const PASOS = [
  {
    estado:      'Recibido',
    iconoActivo: '⏱',
    titulo:      'Recibido',
    descripcion: 'Tu orden ha llegado a la cocina.',
  },
  {
    estado:      'Preparando',
    iconoActivo: '🔥',
    titulo:      'En Preparación',
    descripcion: 'Nuestros cocineros están preparando tu pedido.',
  },
  {
    estado:      'Listo',
    iconoActivo: '🔔',
    titulo:      '¡Listo para entregar!',
    descripcion: 'Tu pedido está listo y un mesero lo llevará a tu mesa.',
  },
];

const OrderTrackingPage = () => {
  const { pedidoId } = useParams();
  const navigate     = useNavigate();
  const [pedido, setPedido]                   = useState(null);
  const [cargando, setCargando]               = useState(true);
  const [error, setError]                     = useState(null);
  const [cuentaSolicitada, setCuentaSolicitada] = useState(false);

  useEffect(() => {
    document.body.style.backgroundColor = '#0D0D0D';
    return () => { document.body.style.backgroundColor = ''; };
  }, []);

  // Carga inicial del pedido (incluye exclusiones y notas por ítem)
  useEffect(() => {
    const cargarPedido = async () => {
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          id_pedido,
          id_mesa,
          estado_actual,
          total,
          fecha_creacion,
          mesero:usuarios!pedidos_id_mesero_fkey ( nombre ),
          detalle_pedidos (
            id_detalle,
            cantidad,
            precio_unitario,
            notas,
            productos ( nombre ),
            exclusiones_pedido ( nombre_insumo )
          )
        `)
        .eq('id_pedido', pedidoId)
        .single();

      if (error) setError('No pudimos encontrar tu pedido.');
      else        setPedido(data);
      setCargando(false);
    };
    cargarPedido();
  }, [pedidoId]);

  // Suscripción Realtime a cambios de estado
  useEffect(() => {
    const canal = supabase
      .channel(`pedido-${pedidoId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pedidos', filter: `id_pedido=eq.${pedidoId}` },
        (payload) => {
          setPedido((prev) => ({ ...prev, estado_actual: payload.new.estado_actual }));
        }
      )
      .subscribe();
    return () => supabase.removeChannel(canal);
  }, [pedidoId]);

  const solicitarCuenta = async () => {
    if (!pedido?.id_mesa) return;
    await supabase.from('mesas').update({ estado: 'Por_Pagar' }).eq('id_mesa', pedido.id_mesa);
    setCuentaSolicitada(true);
  };

  const irAlMenu = () => pedido.id_mesa ? navigate(`/mesa/${pedido.id_mesa}`) : navigate('/');

  if (cargando) return (
    <div style={styles.pagina}>
      <p style={styles.mensaje}>Buscando tu pedido...</p>
    </div>
  );
  if (error) return (
    <div style={styles.pagina}>
      <p style={styles.mensaje}>{error}</p>
    </div>
  );
  if (!pedido) return null;

  const pasoActual = PASOS.findIndex((p) => p.estado === pedido.estado_actual);

  return (
    <>
      <style>{TRACKING_CSS}</style>

      <div className="tracking-container" style={styles.pagina}>

        {/* ── Header ── */}
        <div style={styles.header}>
          <h1 style={styles.titulo}>¡Tu pedido está en marcha!</h1>
          <p style={styles.numeroPedidoWrapper}>
            <span className="orden-numero" style={styles.numeroPedido}>
              #{pedido.id_pedido.slice(0, 8).toUpperCase()}
            </span>
          </p>
        </div>

        {/* ── Timeline ── */}
        <div style={styles.timeline}>
          {PASOS.map((paso, index) => {
            const completado = index < pasoActual;
            const activo     = index === pasoActual;
            const esUltimo   = index === PASOS.length - 1;
            const icono      = completado ? '✓' : activo ? paso.iconoActivo : '';

            return (
              <div key={paso.estado} style={styles.pasoWrapper}>
                {/* Columna izquierda: círculo + línea conectora */}
                <div style={styles.iconoColumna}>
                  <div
                    className={
                      activo    ? 'estado-activo-circulo'    :
                      completado ? 'estado-completado-circulo' :
                      undefined
                    }
                    style={{
                      ...styles.iconoBase,
                      ...(completado ? styles.iconoCompletado :
                          activo     ? styles.iconoActivo     :
                                       styles.iconoPendiente),
                    }}
                  >
                    <span style={{ fontSize: completado ? '18px' : '20px', lineHeight: 1 }}>
                      {icono}
                    </span>
                  </div>

                  {!esUltimo && (
                    <div
                      className={completado ? 'timeline-line-active' : undefined}
                      style={{
                        ...styles.lineaConectora,
                        ...(completado ? {} : { backgroundColor: '#333' }),
                      }}
                    />
                  )}
                </div>

                {/* Columna derecha: título y descripción */}
                <div style={{ ...styles.pasoTexto, paddingBottom: esUltimo ? '8px' : '48px' }}>
                  <span style={{
                    ...styles.pasoTitulo,
                    ...(completado ? styles.pasoTituloCompletado :
                        activo     ? styles.pasoTituloActivo     :
                                     styles.pasoTituloPendiente),
                  }}>
                    {paso.titulo}
                  </span>
                  {(activo || completado) && (
                    <span style={{ ...styles.pasoDescripcion, ...(completado ? { color: '#555' } : {}) }}>
                      {paso.descripcion}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Mesero asignado (solo cuando Listo) ── */}
        {pedido.estado_actual === 'Listo' && pedido.mesero?.nombre && (
          <div style={styles.meseroBanner}>
            <span style={{ fontSize: '28px' }}>🛎</span>
            <div>
              <p style={styles.meseroTitulo}>Tu pedido será entregado por</p>
              <p style={styles.meseroNombre}>{pedido.mesero.nombre}</p>
            </div>
          </div>
        )}

        {/* ── Resumen del pedido ── */}
        <div style={styles.resumen}>
          <h3 style={styles.resumenTitulo}>Resumen del Pedido</h3>
          {pedido.detalle_pedidos.map((detalle, i) => (
            <div
              key={i}
              style={{
                ...styles.resumenItem,
                ...(i < pedido.detalle_pedidos.length - 1 ? { borderBottom: '1px solid #2A2A2A' } : {}),
              }}
            >
              <div style={styles.resumenItemRow}>
                <span style={styles.resumenItemNombre}>{detalle.productos.nombre}</span>
                <span style={styles.resumenItemCantidad}>{detalle.cantidad}x</span>
              </div>
              {detalle.exclusiones_pedido?.length > 0 && (
                <p style={styles.resumenExclusiones}>
                  SIN: {detalle.exclusiones_pedido.map((e) => e.nombre_insumo).join(', ')}
                </p>
              )}
              {detalle.notas && (
                <p style={styles.resumenNotas}>📝 {detalle.notas}</p>
              )}
            </div>
          ))}
        </div>

        {/* ── Acciones cuando el pedido está Listo ── */}
        {pedido.estado_actual === 'Listo' && !cuentaSolicitada && (
          <div style={styles.acciones}>
            <button className="btn-cuenta" style={styles.btnCuenta} onClick={solicitarCuenta}>
              Solicitar la cuenta
            </button>
            <button className="btn-agregar-mas" style={styles.btnAgregarMas} onClick={irAlMenu}>
              Pedir algo más
            </button>
          </div>
        )}

        {/* ── Banner cuenta solicitada ── */}
        {pedido.estado_actual === 'Listo' && cuentaSolicitada && (
          <div style={styles.cuentaBanner}>
            <span style={{ fontSize: '28px' }}>✅</span>
            <div>
              <p style={styles.cuentaTitulo}>¡Cuenta solicitada!</p>
              <p style={styles.cuentaSub}>Un mesero se acercará en un momento.</p>
            </div>
          </div>
        )}

        {/* ── Agregar más mientras el pedido está activo ── */}
        {['Recibido', 'Preparando'].includes(pedido.estado_actual) && (
          <button className="btn-agregar-mas" style={styles.btnAgregarMas} onClick={irAlMenu}>
            ➕ Agregar más productos al pedido
          </button>
        )}

      </div>
    </>
  );
};

const styles = {
  pagina: {
    backgroundColor: '#0D0D0D',
    minHeight: '100vh',
    maxWidth: '480px',
    margin: '0 auto',
    padding: '24px 16px 40px',
    fontFamily: 'sans-serif',
  },
  mensaje: {
    textAlign: 'center',
    color: '#666',
    fontSize: '15px',
    marginTop: '80px',
  },

  // Header
  header: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  titulo: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#FFFFFF',
    margin: '0 0 10px',
    lineHeight: '1.3',
  },
  numeroPedidoWrapper: { margin: 0 },
  numeroPedido: {
    fontSize: '14px',
    fontFamily: 'monospace',
    letterSpacing: '2px',
  },

  // Timeline
  timeline: { marginBottom: '32px' },
  pasoWrapper: {
    display: 'flex',
    flexDirection: 'row',
    gap: '16px',
    alignItems: 'flex-start',
  },
  iconoColumna: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '52px',
    flexShrink: 0,
  },
  iconoBase: {
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconoCompletado: {
    width: '48px',
    height: '48px',
    backgroundColor: '#B87333',
  },
  iconoActivo: {
    width: '52px',
    height: '52px',
    backgroundColor: 'transparent',
    border: '3px solid #B87333',
  },
  iconoPendiente: {
    width: '44px',
    height: '44px',
    backgroundColor: '#2A2A2A',
    border: '1px solid #333',
  },
  lineaConectora: {
    width: '2px',
    height: '48px',
    marginTop: '4px',
    borderRadius: '1px',
  },
  pasoTexto: {
    flex: 1,
    paddingTop: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  pasoTitulo: { lineHeight: '1.2' },
  pasoTituloCompletado: { color: '#B87333', fontWeight: '600', fontSize: '16px' },
  pasoTituloActivo:     { color: '#FFFFFF', fontWeight: '700', fontSize: '18px' },
  pasoTituloPendiente:  { color: '#555',    fontWeight: '400', fontSize: '15px' },
  pasoDescripcion: {
    fontSize: '13px',
    color: '#CCCCCC',
    lineHeight: '1.4',
  },

  // Mesero
  meseroBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: 'rgba(184,115,51,0.08)',
    border: '1px solid rgba(184,115,51,0.3)',
    borderRadius: '12px',
    padding: '14px 16px',
    marginBottom: '16px',
  },
  meseroTitulo: { margin: 0, fontSize: '12px', color: '#999' },
  meseroNombre: { margin: '2px 0 0', fontSize: '16px', fontWeight: '700', color: '#B87333' },

  // Resumen
  resumen: {
    backgroundColor: '#1A1A1A',
    borderRadius: '16px',
    border: '1px solid #333',
    padding: '20px',
    marginBottom: '20px',
  },
  resumenTitulo: {
    margin: '0 0 4px',
    fontSize: '15px',
    fontWeight: '600',
    color: '#B87333',
    textAlign: 'center',
  },
  resumenItem: {
    padding: '10px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  resumenItemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
  },
  resumenItemNombre: { fontSize: '14px', color: '#FFFFFF', fontWeight: '500' },
  resumenItemCantidad: { fontSize: '14px', color: '#B87333', fontWeight: '600', flexShrink: 0 },
  resumenExclusiones: { margin: 0, fontSize: '12px', color: '#ef5350' },
  resumenNotas: { margin: 0, fontSize: '12px', color: '#d4a06a' },

  // Acciones
  acciones: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '8px',
  },
  btnCuenta: {
    width: '100%',
    padding: '15px',
    backgroundColor: '#B87333',
    color: '#000000',
    border: 'none',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  btnAgregarMas: {
    display: 'block',
    width: '100%',
    padding: '14px',
    backgroundColor: 'transparent',
    color: '#B87333',
    border: '1.5px solid #B87333',
    borderRadius: '12px',
    fontWeight: '600',
    fontSize: '15px',
    cursor: 'pointer',
    textAlign: 'center',
    boxSizing: 'border-box',
    marginTop: '0',
  },

  // Cuenta solicitada
  cuentaBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: 'rgba(59,130,46,0.1)',
    border: '1px solid rgba(59,130,46,0.35)',
    borderRadius: '12px',
    padding: '16px',
    marginTop: '8px',
  },
  cuentaTitulo: { margin: 0, fontWeight: '700', color: '#4caf50', fontSize: '15px' },
  cuentaSub: { margin: '4px 0 0', color: '#999', fontSize: '13px' },
};

export default OrderTrackingPage;
