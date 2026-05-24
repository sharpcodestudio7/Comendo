// src/pages/MeseroPage.jsx
// Vista móvil del mesero. No requiere login:
// el mesero selecciona su nombre al abrir la app y queda guardado en localStorage.
// El selector incluye gestión de meseros: crear, desactivar y reactivar.

import { useEffect, useState, useRef } from 'react';
import { supabase } from '../api/supabase';
import ModalConfirm from '../components/ModalConfirm';

const STORAGE_KEY = 'comendo_mesero_id';

const MeseroPage = () => {
  const [meseroActivo, setMeseroActivo]     = useState(null);
  const [listaMeseros, setListaMeseros]     = useState([]);
  const [pedidos, setPedidos]               = useState([]);
  const [cargando, setCargando]             = useState(true);
  const [entregando, setEntregando]         = useState(null);
  const pedidosAnterioresRef                = useRef([]);

  // ── Estado del CRUD ─────────────────────────────────────────────────
  const [verInactivos, setVerInactivos]     = useState(false);
  const [mostrarForm, setMostrarForm]       = useState(false);
  const [nombre, setNombre]                 = useState('');
  const [guardando, setGuardando]           = useState(false);
  const [error, setError]                   = useState(null);
  const [exito, setExito]                   = useState(null);
  const [meseroAEliminar, setMeseroAEliminar] = useState(null);

  // ── Carga la lista de meseros según el filtro activo ────────────────
  const cargarListaMeseros = async () => {
    const { data } = await supabase
      .from('usuarios')
      .select('id_usuario, nombre')
      .eq('rol', 'Mesero')
      .eq('status_', verInactivos ? 0 : 1)
      .order('nombre');
    setListaMeseros(data || []);
  };

  // ── Al montar: revisar si ya hay mesero guardado ────────────────────
  useEffect(() => {
    const init = async () => {
      const idGuardado = localStorage.getItem(STORAGE_KEY);

      const { data: meseros } = await supabase
        .from('usuarios')
        .select('id_usuario, nombre')
        .eq('rol', 'Mesero')
        .eq('status_', 1)
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

  // Recarga la lista cuando cambia el filtro activos/inactivos
  useEffect(() => {
    if (!meseroActivo) cargarListaMeseros();
  }, [verInactivos]);

  // ── CRUD: Crear mesero ───────────────────────────────────────────────
  const crearMesero = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setGuardando(true);
    setError(null);

    const { error: dbError } = await supabase
      .from('usuarios')
      .insert({
        nombre: nombre.trim(),
        rol: 'Mesero',
        email: `mesero_${Date.now()}@interno.comendo`,
        password_hash: 'sin_auth',
      });

    if (dbError) {
      setError(dbError.message);
    } else {
      setExito(`Mesero "${nombre.trim()}" creado correctamente.`);
      setNombre('');
      setMostrarForm(false);
      await cargarListaMeseros();
      setTimeout(() => setExito(null), 3000);
    }
    setGuardando(false);
  };

  // ── CRUD: Desactivar mesero (soft delete) ───────────────────────────
  const eliminarMesero = async (id) => {
    await supabase.from('usuarios').update({ status_: 0 }).eq('id_usuario', id);
    setMeseroAEliminar(null);
    await cargarListaMeseros();
  };

  // ── CRUD: Reactivar mesero ──────────────────────────────────────────
  const reactivarMesero = async (id) => {
    await supabase.from('usuarios').update({ status_: 1 }).eq('id_usuario', id);
    await cargarListaMeseros();
  };

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
    setVerInactivos(false);
    setMostrarForm(false);
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

  // ── Pantalla de selección / gestión de meseros ──────────────────────
  if (!meseroActivo) {
    return (
      <>
        <div style={styles.selector}>
          <div style={styles.selectorCard}>

            {/* Encabezado */}
            <h1 style={styles.selectorTitulo}>Mr. Arroz Paisa</h1>
            <p style={styles.selectorSub}>
              {verInactivos ? 'Meseros inactivos' : '¿Quién eres?'}
            </p>

            {/* Mensaje de éxito */}
            {exito && <p style={styles.exitoMsg}>{exito}</p>}

            {/* Formulario de creación */}
            {mostrarForm && (
              <form onSubmit={crearMesero} style={styles.form}>
                <input
                  style={styles.input}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre completo del mesero"
                  required
                  autoFocus
                />
                {error && <p style={styles.errorMsg}>{error}</p>}
                <div style={styles.formBotones}>
                  <button
                    type="button"
                    style={styles.btnCancelarForm}
                    onClick={() => { setMostrarForm(false); setNombre(''); setError(null); }}
                  >
                    Cancelar
                  </button>
                  <button type="submit" style={styles.btnGuardar} disabled={guardando}>
                    {guardando ? 'Guardando...' : '✓ Crear'}
                  </button>
                </div>
              </form>
            )}

            {/* Lista de meseros */}
            {cargando ? (
              <p style={styles.cargandoTexto}>Cargando...</p>
            ) : listaMeseros.length === 0 ? (
              <p style={styles.sinMeseros}>
                {verInactivos
                  ? 'No hay meseros inactivos.'
                  : 'No hay meseros registrados.\nCrea el primero con el botón de abajo.'}
              </p>
            ) : (
              <div style={styles.listaBotones}>
                {listaMeseros.map((m) =>
                  verInactivos ? (
                    // Fila de mesero inactivo
                    <div key={m.id_usuario} style={styles.meseroInactivoItem}>
                      <div style={styles.inactivoAvatar}>
                        {m.nombre.charAt(0).toUpperCase()}
                      </div>
                      <span style={styles.inactivoNombre}>{m.nombre}</span>
                      <button
                        style={styles.btnReactivar}
                        onClick={() => reactivarMesero(m.id_usuario)}
                      >
                        Reactivar
                      </button>
                    </div>
                  ) : (
                    // Fila de mesero activo: seleccionar + eliminar
                    <div key={m.id_usuario} style={styles.meseroItem}>
                      <button
                        style={styles.btnMesero}
                        onClick={() => seleccionarMesero(m)}
                      >
                        <span style={styles.btnMeseroAvatar}>
                          {m.nombre.charAt(0).toUpperCase()}
                        </span>
                        <span>{m.nombre}</span>
                      </button>
                      <button
                        style={styles.btnEliminar}
                        onClick={() => setMeseroAEliminar(m)}
                        title="Desactivar mesero"
                      >
                        🗑
                      </button>
                    </div>
                  )
                )}
              </div>
            )}

            {/* Acciones del footer */}
            {!mostrarForm && (
              <div style={styles.accionesBottom}>
                {!verInactivos && (
                  <button
                    style={styles.btnNuevo}
                    onClick={() => { setMostrarForm(true); setExito(null); setError(null); }}
                  >
                    + Nuevo mesero
                  </button>
                )}
                <button
                  style={{
                    ...styles.btnToggleInactivos,
                    ...(verInactivos ? styles.btnToggleInactivosActivo : {}),
                  }}
                  onClick={() => { setVerInactivos(!verInactivos); setMostrarForm(false); setExito(null); }}
                >
                  {verInactivos ? '← Ver activos' : '🗂 Ver inactivos'}
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Modal de confirmación para desactivar */}
        {meseroAEliminar && (
          <ModalConfirm
            titulo="Desactivar mesero"
            mensaje={`¿Seguro que deseas desactivar a "${meseroAEliminar.nombre}"? Podrás reactivarlo cuando lo necesites.`}
            labelConfirmar="Desactivar"
            colorConfirmar="#8B1A1A"
            onConfirmar={() => eliminarMesero(meseroAEliminar.id_usuario)}
            onCancelar={() => setMeseroAEliminar(null)}
          />
        )}
      </>
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
  // ── Selector de mesero ──────────────────────────────────────────────────
  selector: {
    minHeight: '100vh',
    backgroundColor: '#0D0D0D',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    fontFamily: 'sans-serif',
  },
  selectorCard: {
    backgroundColor: '#1A1A1A',
    border: '1px solid #333',
    borderRadius: '16px',
    padding: '32px 28px',
    width: '100%',
    maxWidth: '380px',
    textAlign: 'center',
  },
  selectorTitulo: {
    margin: '0 0 4px',
    color: '#C8A84E',
    fontSize: '26px',
    fontFamily: 'Georgia, serif',
    fontStyle: 'italic',
  },
  selectorSub: { margin: '0 0 20px', color: '#AAAAAA', fontSize: '15px' },

  // Mensaje de éxito
  exitoMsg: {
    backgroundColor: 'rgba(27,94,32,0.15)',
    border: '1px solid rgba(76,175,80,0.3)',
    color: '#4CAF50',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '13px',
    marginBottom: '14px',
    textAlign: 'left',
  },

  // Formulario de creación
  form: {
    backgroundColor: '#2A2A2A',
    border: '1px solid #333',
    borderRadius: '10px',
    padding: '16px',
    marginBottom: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    textAlign: 'left',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #444',
    backgroundColor: '#1A1A1A',
    color: '#FFFFFF',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  errorMsg: { color: '#ff6b6b', fontSize: '13px', margin: 0 },
  formBotones: { display: 'flex', gap: '10px' },
  btnCancelarForm: {
    flex: 1,
    padding: '10px',
    backgroundColor: 'transparent',
    border: '1px solid #333',
    color: '#AAAAAA',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  btnGuardar: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#B87333',
    color: '#0D0D0D',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '14px',
  },

  // Lista de meseros
  listaBotones: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '4px' },

  // Fila de mesero activo
  meseroItem: { display: 'flex', alignItems: 'center', gap: '8px' },
  btnMesero: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#2A2A2A',
    border: '1px solid #333',
    borderRadius: '10px',
    cursor: 'pointer',
    color: '#FFFFFF',
    fontSize: '15px',
    fontWeight: '600',
    textAlign: 'left',
  },
  btnMeseroAvatar: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    backgroundColor: '#B87333',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '15px',
    fontWeight: '700',
    color: '#0D0D0D',
    flexShrink: 0,
  },
  btnEliminar: {
    padding: '10px 12px',
    background: 'none',
    border: '1px solid #333',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    color: '#666',
    flexShrink: 0,
    minHeight: '44px',
  },

  // Fila de mesero inactivo
  meseroInactivoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    backgroundColor: '#2A2A2A',
    borderRadius: '10px',
    border: '1px solid #333',
    opacity: 0.7,
  },
  inactivoAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#333',
    color: '#666',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '700',
    flexShrink: 0,
  },
  inactivoNombre: { flex: 1, color: '#AAAAAA', fontSize: '14px', textAlign: 'left' },
  btnReactivar: {
    padding: '6px 14px',
    backgroundColor: 'rgba(184,115,51,0.12)',
    border: '1px solid rgba(184,115,51,0.35)',
    color: '#B87333',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    flexShrink: 0,
  },

  // Sin meseros
  sinMeseros: { color: '#AAAAAA', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-line' },
  cargandoTexto: { color: '#666', textAlign: 'center' },

  // Acciones del footer del selector
  accionesBottom: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid #333',
  },
  btnNuevo: {
    padding: '12px',
    backgroundColor: '#B87333',
    color: '#0D0D0D',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '15px',
    minHeight: '44px',
  },
  btnToggleInactivos: {
    padding: '10px',
    backgroundColor: 'transparent',
    border: '1px solid #333',
    color: '#666',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    minHeight: '44px',
  },
  btnToggleInactivosActivo: {
    color: '#B87333',
    borderColor: 'rgba(184,115,51,0.5)',
    backgroundColor: 'rgba(184,115,51,0.08)',
  },

  // ── Vista principal del mesero ──────────────────────────────────────────
  pagina: {
    maxWidth: '480px',
    margin: '0 auto',
    minHeight: '100vh',
    backgroundColor: '#0D0D0D',
    fontFamily: 'sans-serif',
    paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 16px 16px',
    borderBottom: '1px solid #333',
  },
  titulo: { margin: 0, fontSize: '20px', fontWeight: '700', color: '#FFFFFF' },
  subtitulo: { margin: '4px 0 0', fontSize: '14px', color: '#AAAAAA' },
  btnCambiar: {
    padding: '8px 14px',
    backgroundColor: 'transparent',
    border: '1px solid #333',
    color: '#AAAAAA',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    minHeight: '44px',
  },
  lista: { padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' },
  sinPedidos: { textAlign: 'center', marginTop: '60px' },
  sinIcono: { fontSize: '48px', margin: '0 0 8px' },
  sinTexto: { fontSize: '18px', fontWeight: '700', color: '#FFFFFF', margin: '0 0 4px' },
  sinSub: { fontSize: '14px', color: '#AAAAAA', margin: 0 },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #333',
    borderLeft: '4px solid #C8A84E',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  mesaNum: { fontSize: '20px', fontWeight: '700', color: '#FFFFFF' },
  pedidoId: { fontSize: '12px', color: '#666' },
  productos: { display: 'flex', flexDirection: 'column', gap: '4px' },
  producto: { fontSize: '15px', color: '#AAAAAA' },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid #333',
    paddingTop: '12px',
  },
  total: { fontSize: '16px', fontWeight: '700', color: '#C8A84E' },
  btnEntregado: {
    padding: '10px 20px',
    backgroundColor: '#B87333',
    color: '#0D0D0D',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '14px',
    cursor: 'pointer',
    minHeight: '44px',
  },
};

export default MeseroPage;
