// src/pages/OrderTrackingPage.jsx
// Pantalla de seguimiento del pedido en tiempo real.
// Usa Supabase Realtime para escuchar cambios de estado sin recargar la página.

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabase';


// Definimos los pasos del flujo en orden
const PASOS = [
  {
    estado: 'Recibido',
    icono: '✅',
    titulo: 'Recibido',
    descripcion: 'Tu orden ha llegado a la cocina.',
  },
  {
    estado: 'Preparando',
    icono: '🍳',
    titulo: 'En Preparación',
    descripcion: 'Nuestros cocineros están preparando tu pedido.',
  },
  {
    estado: 'Listo',
    icono: '🔔',
    titulo: '¡Listo!',
    descripcion: 'Tu pedido está listo y un mesero lo llevará a tu mesa.',
  },
];

const OrderTrackingPage = () => {
  const { pedidoId } = useParams();
  const navigate = useNavigate();
  const [pedido, setPedido] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [cuentaSolicitada, setCuentaSolicitada] = useState(false);

  // ── PASO 1: Carga inicial del pedido ──────────────────────────────────────
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
            cantidad,
            precio_unitario,
            productos ( nombre )
          )
        `)
        .eq('id_pedido', pedidoId)
        .single();

      if (error) {
        setError('No pudimos encontrar tu pedido.');
      } else {
        setPedido(data);
      }
      setCargando(false);
    };

    cargarPedido();
  }, [pedidoId]);

  // ── PASO 2: Suscripción en tiempo real a cambios de estado ────────────────
  useEffect(() => {
    // Supabase Realtime escucha cualquier UPDATE en la fila de este pedido
    const canal = supabase
      .channel(`pedido-${pedidoId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pedidos',
          filter: `id_pedido=eq.${pedidoId}`,
        },
        (payload) => {
          // Cuando la cocina cambie el estado, actualizamos la UI automáticamente
          setPedido((prev) => ({
            ...prev,
            estado_actual: payload.new.estado_actual,
          }));
        }
      )
      .subscribe();

    // Limpiamos la suscripción cuando el componente se desmonta
    return () => supabase.removeChannel(canal);
  }, [pedidoId]);

  const solicitarCuenta = async () => {
    if (!pedido?.id_mesa) return;
    await supabase
      .from('mesas')
      .update({ estado: 'Por_Pagar' })
      .eq('id_mesa', pedido.id_mesa);
    setCuentaSolicitada(true);
  };

  // ── Renders condicionales ─────────────────────────────────────────────────
  if (cargando) return <p style={styles.mensaje}>Buscando tu pedido...</p>;
  if (error)    return <p style={styles.mensaje}>{error}</p>;
  if (!pedido)  return null;

  // Índice del estado actual en el array PASOS
  const pasoActual = PASOS.findIndex((p) => p.estado === pedido.estado_actual);

  return (
    <div style={styles.pagina}>

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.titulo}>¡Tu pedido está en marcha!</h1>
        <p style={styles.numeroPedido}>
          Orden #{pedido.id_pedido.slice(0, 8).toUpperCase()}
        </p>
      </div>

      {/* Timeline de estados */}
      <div style={styles.timeline}>
        {PASOS.map((paso, index) => {
          const completado = index <= pasoActual;
          const activo = index === pasoActual;

          return (
            <div key={paso.estado} style={styles.paso}>
              {/* Ícono del paso */}
              <div style={{
                ...styles.icono,
                backgroundColor: completado ? '#2D6A4F' : '#e0e0e0',
                transform: activo ? 'scale(1.2)' : 'scale(1)',
                transition: 'all 0.3s ease',
              }}>
                {paso.icono}
              </div>

              {/* Línea conectora (no se muestra en el último paso) */}
              {index < PASOS.length - 1 && (
                <div style={{
                  ...styles.lineaConectora,
                  backgroundColor: index < pasoActual ? '#2D6A4F' : '#e0e0e0',
                }} />
              )}

              {/* Texto del paso */}
              <div style={styles.pasoTexto}>
                <span style={{
                  ...styles.pasoTitulo,
                  color: completado ? '#2D6A4F' : '#999',
                  fontWeight: activo ? '700' : '500',
                }}>
                  {paso.titulo}
                </span>
                {activo && (
                  <span style={styles.pasoDescripcion}>{paso.descripcion}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mesero asignado — visible cuando el pedido está Listo */}
      {pedido.estado_actual === 'Listo' && pedido.mesero?.nombre && (
        <div style={styles.meseroBanner}>
          <span style={styles.meseroIcono}>🛎</span>
          <div>
            <p style={styles.meseroTitulo}>Tu pedido será entregado por</p>
            <p style={styles.meseroNombre}>{pedido.mesero.nombre}</p>
          </div>
        </div>
      )}

      {/* Resumen del pedido */}
      <div style={styles.resumen}>
        <h3 style={styles.resumenTitulo}>Resumen del Pedido</h3>
        {pedido.detalle_pedidos.map((detalle, i) => (
          <p key={i} style={styles.resumenItem}>
            {detalle.cantidad}x {detalle.productos.nombre}
          </p>
        ))}
      </div>

      {/* Acciones según estado del pedido */}
      {pedido.estado_actual === 'Listo' && !cuentaSolicitada && (
        <div style={styles.accionesListo}>
          <button
            style={styles.btnCuenta}
            onClick={solicitarCuenta}
          >
            💳 Solicitar la cuenta
          </button>
          <button
            style={styles.btnAgregarMas}
            onClick={() => pedido.id_mesa ? navigate(`/mesa/${pedido.id_mesa}`) : navigate('/')}
          >
            🍹 Pedir algo más
          </button>
        </div>
      )}

      {pedido.estado_actual === 'Listo' && cuentaSolicitada && (
        <div style={styles.cuentaSolicitadaBanner}>
          <span style={styles.cuentaIcono}>✅</span>
          <div>
            <p style={styles.cuentaTitulo}>¡Cuenta solicitada!</p>
            <p style={styles.cuentaSub}>Un mesero se acercará en un momento.</p>
          </div>
        </div>
      )}

      {['Recibido', 'Preparando'].includes(pedido.estado_actual) && (
        <button
          style={styles.btnAgregarMas}
          onClick={() => pedido.id_mesa ? navigate(`/mesa/${pedido.id_mesa}`) : navigate('/')}
        >
          ➕ Agregar más productos al pedido
        </button>
      )}

    </div>
  );
};

const styles = {
  pagina: { maxWidth: '480px', margin: '0 auto', padding: '24px 16px', fontFamily: 'sans-serif' },
  mensaje: { textAlign: 'center', marginTop: '40px', fontSize: '16px' },
  header: { textAlign: 'center', marginBottom: '32px' },
  titulo: { fontSize: '22px', fontWeight: '700', margin: '0 0 8px' },
  numeroPedido: { color: '#666', fontSize: '14px', margin: 0 },
  timeline: { display: 'flex', flexDirection: 'column', gap: '0px', marginBottom: '32px' },
  paso: { display: 'flex', alignItems: 'flex-start', gap: '16px', position: 'relative' },
  icono: {
    width: '48px', height: '48px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '20px', flexShrink: 0,
  },
  lineaConectora: {
    position: 'absolute',
    left: '23px', top: '48px',
    width: '2px', height: '40px',
  },
  pasoTexto: { display: 'flex', flexDirection: 'column', paddingTop: '10px', paddingBottom: '40px' },
  pasoTitulo: { fontSize: '16px' },
  pasoDescripcion: { fontSize: '13px', color: '#666', marginTop: '4px' },
  resumen: { backgroundColor: '#f9f9f9', borderRadius: '12px', padding: '16px' },
  resumenTitulo: { margin: '0 0 12px', fontSize: '16px', fontWeight: '700' },
  resumenItem: { margin: '4px 0', fontSize: '14px', color: '#444' },
  accionesListo: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' },
  btnCuenta: {
    width: '100%', padding: '14px', backgroundColor: '#2D6A4F',
    color: '#fff', border: 'none', borderRadius: '10px',
    fontWeight: '700', fontSize: '16px', cursor: 'pointer',
  },
  btnAgregarMas: {
    display: 'block', width: '100%', marginTop: '16px',
    padding: '14px', backgroundColor: '#fff',
    color: '#2D6A4F', border: '2px solid #2D6A4F',
    borderRadius: '10px', fontWeight: '700', fontSize: '16px',
    cursor: 'pointer',
  },
  meseroBanner: {
    display: 'flex', alignItems: 'center', gap: '12px',
    backgroundColor: '#e8f5e9', border: '1px solid #2D6A4F',
    borderRadius: '10px', padding: '14px 16px', marginBottom: '16px',
  },
  meseroIcono: { fontSize: '28px' },
  meseroTitulo: { margin: 0, fontSize: '12px', color: '#555' },
  meseroNombre: { margin: '2px 0 0', fontSize: '16px', fontWeight: '700', color: '#2D6A4F' },
  cuentaSolicitadaBanner: {
    display: 'flex', alignItems: 'center', gap: '12px',
    marginTop: '16px', backgroundColor: '#e8f5e9',
    border: '1px solid #2D6A4F', borderRadius: '10px', padding: '16px',
  },
  cuentaIcono: { fontSize: '28px' },
  cuentaTitulo: { margin: 0, fontWeight: '700', color: '#2D6A4F', fontSize: '15px' },
  cuentaSub: { margin: '4px 0 0', color: '#555', fontSize: '13px' },
};

export default OrderTrackingPage;
