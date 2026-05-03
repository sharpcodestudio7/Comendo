// src/pages/MeseroPage.jsx
// Vista móvil del mesero. No requiere login:
// el mesero selecciona su nombre al abrir la app y queda guardado en localStorage.

import { useEffect, useState, useRef } from 'react';
import { supabase } from '../api/supabase';

const STORAGE_KEY = 'comendo_mesero_id';

const MeseroPage = () => {
  const [meseroActivo, setMeseroActivo] = useState(null); // { id_usuario, nombre }
  const [listaMeseros, setListaMeseros] = useState([]);
  const [pedidos, setPedidos]           = useState([]);
  const [cargando, setCargando]         = useState(true);
  const [entregando, setEntregando]     = useState(null);
  const pedidosAnterioresRef            = useRef([]);

  // ── Al montar: revisar si ya hay mesero guardado ────────────────────
  useEffect(() => {
    const init = async () => {
      const idGuardado = localStorage.getItem(STORAGE_KEY);

      // Cargar lista de meseros disponibles
      const { data: meseros } = await supabase
        .from('usuarios')
        .select('id_usuario, nombre')
        .eq('rol', 'Mesero')
        .order('nombre');

      setListaMeseros(meseros || []);

      if (idGuardado && meseros?.some((m) => m.id_usuario === idGuardado)) {
        const mesero = meseros.find((m) => m.id_usuario === idGuardado);
        setMeseroActivo(mesero);
        await cargarPedidos(idGuardado);
        solicitarPermisoNotificaciones();
      }

      setCargando(false);
    };

    init();
  }, []);

  const seleccionarMesero = async (mesero) => {
    localStorage.setItem(STORAGE_KEY, mesero.id_usuario);
    setMeseroActivo(mesero);
    setCargando(true);
    await cargarPedidos(mesero.id_usuario);
    solicitarPermisoNotificaciones();
    setCargando(false);
  };

  const cerrarSesion = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMeseroActivo(null);
    setPedidos([]);
  };

  // ── Notificaciones del navegador ────────────────────────────────────
  const solicitarPermisoNotificaciones = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const notificar = (titulo, cuerpo) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(titulo, { body: cuerpo, icon: '/icons/icon-192.png' });
    }
  };

  // ── Cargar pedidos Listo asignados a este mesero ────────────────────
  const cargarPedidos = async (idMesero) => {
    const { data } = await supabase
      .from('pedidos')
      .select(`
        id_pedido,
        estado_actual,
        total,
        fecha_creacion,
        mesas ( numero ),
        detalle_pedidos (
          cantidad,
          productos ( nombre )
        )
      `)
      .eq('id_mesero', idMesero)
      .eq('estado_actual', 'Listo')
      .order('fecha_creacion', { ascending: true });

    setPedidos(data || []);
    return data || [];
  };

  // ── Realtime: escuchar nuevas asignaciones ──────────────────────────
  useEffect(() => {
    if (!meseroActivo) return;

    const canal = supabase
      .channel(`mesero-${meseroActivo.id_usuario}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pedidos' },
        async (payload) => {
          const p = payload.new;
          if (p.id_mesero === meseroActivo.id_usuario) {
            const actualizados = await cargarPedidos(meseroActivo.id_usuario);
            if (p.estado_actual === 'Listo') {
              const eraVisible = pedidosAnterioresRef.current.some(
                (prev) => prev.id_pedido === p.id_pedido
              );
              if (!eraVisible) {
                notificar('🛎 Nuevo pedido asignado', 'Tienes un pedido listo para entregar');
              }
            }
            pedidosAnterioresRef.current = actualizados;
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(canal);
  }, [meseroActivo]);

  // ── Marcar pedido como Entregado ────────────────────────────────────
  const marcarEntregado = async (pedidoId) => {
    setEntregando(pedidoId);
    await supabase
      .from('pedidos')
      .update({ estado_actual: 'Entregado' })
      .eq('id_pedido', pedidoId);
    await cargarPedidos(meseroActivo.id_usuario);
    setEntregando(null);
  };

  const formatCOP = (valor) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor);

  // ── Pantalla de selección de mesero ────────────────────────────────
  if (!meseroActivo) {
    return (
      <div style={styles.selector}>
        <div style={styles.selectorCard}>
          <h1 style={styles.selectorTitulo}>🛎 Comendo</h1>
          <p style={styles.selectorSub}>¿Quién eres?</p>

          {cargando ? (
            <p style={styles.cargandoTexto}>Cargando...</p>
          ) : listaMeseros.length === 0 ? (
            <p style={styles.sinMeseros}>No hay meseros registrados.<br/>Pide al administrador que te agregue.</p>
          ) : (
            <div style={styles.listaBotones}>
              {listaMeseros.map((m) => (
                <button
                  key={m.id_usuario}
                  style={styles.btnMesero}
                  onClick={() => seleccionarMesero(m)}
                >
                  <span style={styles.btnMeseroAvatar}>{m.nombre.charAt(0).toUpperCase()}</span>
                  <span>{m.nombre}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Vista principal del mesero ──────────────────────────────────────
  return (
    <div style={styles.pagina}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.titulo}>🛎 Mis Entregas</h1>
          <p style={styles.subtitulo}>{meseroActivo.nombre}</p>
        </div>
        <button style={styles.btnCambiar} onClick={cerrarSesion}>Cambiar</button>
      </div>

      <div style={styles.lista}>
        {cargando ? (
          <p style={styles.cargandoTexto}>Cargando pedidos...</p>
        ) : pedidos.length === 0 ? (
          <div style={styles.sinPedidos}>
            <p style={styles.sinIcono}>✅</p>
            <p style={styles.sinTexto}>Sin pedidos pendientes</p>
            <p style={styles.sinSub}>Te notificaremos cuando haya uno listo.</p>
          </div>
        ) : (
          pedidos.map((pedido) => (
            <div key={pedido.id_pedido} style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.mesaNum}>Mesa {pedido.mesas?.numero ?? '—'}</span>
                <span style={styles.pedidoId}>#{pedido.id_pedido.slice(0, 6).toUpperCase()}</span>
              </div>
              <div style={styles.productos}>
                {pedido.detalle_pedidos.map((d, i) => (
                  <span key={i} style={styles.producto}>
                    {d.cantidad}x {d.productos?.nombre}
                  </span>
                ))}
              </div>
              <div style={styles.cardFooter}>
                <span style={styles.total}>{formatCOP(pedido.total)}</span>
                <button
                  style={{ ...styles.btnEntregado, opacity: entregando === pedido.id_pedido ? 0.7 : 1 }}
                  onClick={() => marcarEntregado(pedido.id_pedido)}
                  disabled={entregando === pedido.id_pedido}
                >
                  {entregando === pedido.id_pedido ? 'Confirmando...' : '✓ Entregado'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const styles = {
  // Selector
  selector: { minHeight: '100vh', backgroundColor: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', fontFamily: 'Arial, sans-serif' },
  selectorCard: { backgroundColor: '#16213e', borderRadius: '16px', padding: '40px 32px', width: '100%', maxWidth: '380px', textAlign: 'center' },
  selectorTitulo: { margin: '0 0 4px', color: '#fff', fontSize: '28px' },
  selectorSub: { margin: '0 0 28px', color: '#888', fontSize: '16px' },
  listaBotones: { display: 'flex', flexDirection: 'column', gap: '10px' },
  btnMesero: { display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', backgroundColor: '#0f3460', border: '2px solid #2D6A4F', borderRadius: '10px', cursor: 'pointer', color: '#fff', fontSize: '16px', fontWeight: '600', textAlign: 'left' },
  btnMeseroAvatar: { width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#2D6A4F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', flexShrink: 0 },
  sinMeseros: { color: '#888', fontSize: '14px', lineHeight: '1.6' },
  cargandoTexto: { color: '#888', textAlign: 'center' },

  // Vista principal
  pagina: { maxWidth: '480px', margin: '0 auto', minHeight: '100vh', backgroundColor: '#f5f5f5', fontFamily: 'Arial, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 16px', backgroundColor: '#2D6A4F', color: '#fff' },
  titulo: { margin: 0, fontSize: '20px', fontWeight: '700' },
  subtitulo: { margin: '4px 0 0', fontSize: '14px', opacity: 0.85 },
  btnCambiar: { padding: '8px 14px', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.5)', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  lista: { padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' },
  sinPedidos: { textAlign: 'center', marginTop: '60px' },
  sinIcono: { fontSize: '48px', margin: '0 0 8px' },
  sinTexto: { fontSize: '18px', fontWeight: '700', color: '#333', margin: '0 0 4px' },
  sinSub: { fontSize: '14px', color: '#888', margin: 0 },
  card: { backgroundColor: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderLeft: '4px solid #2D6A4F', display: 'flex', flexDirection: 'column', gap: '12px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  mesaNum: { fontSize: '20px', fontWeight: '700', color: '#1a1a2e' },
  pedidoId: { fontSize: '12px', color: '#999' },
  productos: { display: 'flex', flexDirection: 'column', gap: '4px' },
  producto: { fontSize: '15px', color: '#444' },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f0f0f0', paddingTop: '12px' },
  total: { fontSize: '16px', fontWeight: '700', color: '#2D6A4F' },
  btnEntregado: { padding: '10px 20px', backgroundColor: '#2D6A4F', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' },
};

export default MeseroPage;
