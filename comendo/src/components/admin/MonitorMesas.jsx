// src/components/admin/MonitorMesas.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../api/supabase';
import ModalConfirm from '../ModalConfirm';

const ESTADOS_MESA = {
  Libre: { color: '#2D6A4F', emoji: '🟢', label: 'Libre' },
  Ocupada: { color: '#F57C00', emoji: '🟡', label: 'Ocupada' },
  Por_Pagar: { color: '#E53935', emoji: '🔴', label: 'Por Pagar' },
};

const METODOS_PAGO = [
  { id: 'efectivo',  label: 'Efectivo',  emoji: '💵', color: '#2D6A4F' },
  { id: 'nequi',     label: 'Nequi',     emoji: '💜', color: '#7B1FA2' },
  { id: 'daviplata', label: 'Daviplata', emoji: '🔴', color: '#E53935' },
];

const MonitorMesas = () => {
  const [mesas, setMesas] = useState([]);
  const [pedidosPorMesa, setPedidosPorMesa] = useState({});
  const [cargando, setCargando] = useState(true);
  const [cerrando, setCerrando] = useState(null);
  const [modalCerrar, setModalCerrar] = useState(null);
  const [editandoPago, setEditandoPago] = useState(null); // id_pedido que se está editando

  const cargarDatos = async () => {
    setCargando(true);
    const [{ data: mesasData }, { data: pedidosData }] = await Promise.all([
      supabase.from('mesas').select('*').order('numero'),
      supabase
        .from('pedidos')
        .select(`
          id_pedido,
          id_mesa,
          estado_actual,
          total,
          metodo_pago,
          fecha_creacion,
          mesero:usuarios!pedidos_id_mesero_fkey ( nombre ),
          detalle_pedidos (
            cantidad,
            productos ( nombre )
          )
        `)
        .in('estado_actual', ['Recibido', 'Preparando', 'Listo', 'Entregado']),
    ]);

    const agrupados = {};
    pedidosData?.forEach((pedido) => {
      if (!agrupados[pedido.id_mesa]) agrupados[pedido.id_mesa] = [];
      agrupados[pedido.id_mesa].push(pedido);
    });

    setMesas(mesasData || []);
    setPedidosPorMesa(agrupados);
    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    const canal = supabase
      .channel('monitor-mesas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' }, () => cargarDatos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => cargarDatos())
      .subscribe();
    return () => supabase.removeChannel(canal);
  }, []);

  const cambiarMetodoPago = async (pedidoId, nuevoMetodo) => {
    await supabase
      .from('pedidos')
      .update({ metodo_pago: nuevoMetodo })
      .eq('id_pedido', pedidoId);
    setEditandoPago(null);
    await cargarDatos();
  };

  const cerrarMesa = (mesa) => setModalCerrar(mesa);

  const confirmarCerrarMesa = async () => {
    try {
      setCerrando(modalCerrar.id_mesa);
      const mesaACerrar = modalCerrar;
      setModalCerrar(null);

      const pedidosActivos = pedidosPorMesa[mesaACerrar.id_mesa] || [];
      for (const pedido of pedidosActivos) {
        await supabase
          .from('pedidos')
          .update({ estado_actual: 'Pagado' })
          .eq('id_pedido', pedido.id_pedido);
      }

      await supabase
        .from('mesas')
        .update({ estado: 'Libre', token_sesion_actual: null })
        .eq('id_mesa', mesaACerrar.id_mesa);

      await cargarDatos();
    } catch (err) {
      console.error('Error al cerrar mesa:', err);
    } finally {
      setCerrando(null);
    }
  };

  const totalMesa = (idMesa) => {
    const pedidos = pedidosPorMesa[idMesa] || [];
    return pedidos.reduce((acc, p) => acc + p.total, 0);
  };

  const formatCOP = (valor) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor);

  const mesasLibres = mesas.filter((m) => m.estado === 'Libre').length;
  const mesasOcupadas = mesas.filter((m) => m.estado === 'Ocupada').length;
  const mesasPorPagar = mesas.filter((m) => m.estado === 'Por_Pagar').length;

  if (cargando) return <p style={{ color: '#fff' }}>Cargando mesas...</p>;

  return (
    <div>
      <div style={styles.header}>
        <h2 style={styles.titulo}>🗺 Monitor de Mesas</h2>
        <button style={styles.btnRefresh} onClick={cargarDatos}>🔄 Actualizar</button>
      </div>

      <div style={styles.kpiGrid}>
        <div style={{ ...styles.kpiCard, borderTop: `3px solid ${ESTADOS_MESA.Libre.color}` }}>
          <span style={styles.kpiLabel}>🟢 Libres</span>
          <span style={styles.kpiValor}>{mesasLibres}</span>
        </div>
        <div style={{ ...styles.kpiCard, borderTop: `3px solid ${ESTADOS_MESA.Ocupada.color}` }}>
          <span style={styles.kpiLabel}>🟡 Ocupadas</span>
          <span style={styles.kpiValor}>{mesasOcupadas}</span>
        </div>
        <div style={{ ...styles.kpiCard, borderTop: `3px solid ${ESTADOS_MESA.Por_Pagar.color}` }}>
          <span style={styles.kpiLabel}>🔴 Por Pagar</span>
          <span style={styles.kpiValor}>{mesasPorPagar}</span>
        </div>
        <div style={{ ...styles.kpiCard, borderTop: '3px solid #1565C0' }}>
          <span style={styles.kpiLabel}>📊 Total Mesas</span>
          <span style={styles.kpiValor}>{mesas.length}</span>
        </div>
      </div>

      <div style={styles.grid}>
        {mesas.map((mesa) => {
          const estado = ESTADOS_MESA[mesa.estado] || ESTADOS_MESA.Libre;
          const pedidos = pedidosPorMesa[mesa.id_mesa] || [];
          const total = totalMesa(mesa.id_mesa);
          const estaOcupada = mesa.estado !== 'Libre';

          return (
            <div key={mesa.id_mesa} style={{ ...styles.card, borderTop: `4px solid ${estado.color}` }}>
              <div style={styles.cardHeader}>
                <h3 style={styles.mesaNumero}>Mesa {mesa.numero}</h3>
                <span style={{ ...styles.estadoBadge, backgroundColor: estado.color }}>
                  {estado.emoji} {estado.label}
                </span>
              </div>

              {pedidos.length > 0 ? (
                <div style={styles.pedidosLista}>
                  {pedidos.map((pedido) => {
                    const metodo = METODOS_PAGO.find((m) => m.id === pedido.metodo_pago);
                    const estaEditando = editandoPago === pedido.id_pedido;
                    return (
                      <div key={pedido.id_pedido} style={styles.pedidoItem}>
                        <div style={styles.pedidoHeader}>
                          <span style={styles.pedidoId}>#{pedido.id_pedido.slice(0, 6).toUpperCase()}</span>
                          <span style={{ ...styles.pedidoEstado, color: pedido.estado_actual === 'Listo' ? '#4CAF50' : '#F57C00' }}>
                            {pedido.estado_actual}
                          </span>
                        </div>
                        {pedido.detalle_pedidos.map((d, i) => (
                          <span key={i} style={styles.pedidoProducto}>
                            {d.cantidad}x {d.productos?.nombre}
                          </span>
                        ))}

                        {/* Mesero asignado */}
                        {pedido.mesero?.nombre && (
                          <div style={styles.meseroRow}>
                            <span style={styles.meseroBadge}>🛎 {pedido.mesero.nombre}</span>
                          </div>
                        )}

                        {/* Método de pago */}
                        {!estaEditando ? (
                          <div style={styles.pagoRow}>
                            {metodo ? (
                              <span style={{ ...styles.pagoBadge, backgroundColor: metodo.color }}>
                                {metodo.emoji} {metodo.label}
                              </span>
                            ) : (
                              <span style={styles.pagoSinDefinir}>Sin método</span>
                            )}
                            <button
                              style={styles.btnEditarPago}
                              onClick={() => setEditandoPago(pedido.id_pedido)}
                            >
                              ✏️ Cambiar
                            </button>
                          </div>
                        ) : (
                          <div style={styles.pagoEditor}>
                            <span style={styles.pagoEditorLabel}>Selecciona método:</span>
                            <div style={styles.pagoEditorBotones}>
                              {METODOS_PAGO.map((m) => (
                                <button
                                  key={m.id}
                                  style={{ ...styles.pagoEditorBtn, borderColor: m.color, color: m.color }}
                                  onClick={() => cambiarMetodoPago(pedido.id_pedido, m.id)}
                                >
                                  {m.emoji} {m.label}
                                </button>
                              ))}
                            </div>
                            <button style={styles.btnCancelarPago} onClick={() => setEditandoPago(null)}>
                              Cancelar
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div style={styles.totalMesa}>
                    <span style={styles.totalLabel}>Total Mesa</span>
                    <span style={styles.totalValor}>{formatCOP(total)}</span>
                  </div>
                </div>
              ) : (
                <p style={styles.sinPedidos}>Sin pedidos activos</p>
              )}

              {estaOcupada && (
                <button
                  style={{
                    ...styles.btnCerrar,
                    opacity: cerrando === mesa.id_mesa ? 0.7 : 1,
                    cursor: cerrando === mesa.id_mesa ? 'not-allowed' : 'pointer',
                  }}
                  onClick={() => cerrarMesa(mesa)}
                  disabled={cerrando === mesa.id_mesa}
                >
                  {cerrando === mesa.id_mesa ? 'Cerrando...' : '💳 Cobrar y Liberar Mesa'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ✅ Modal dentro del return */}
      {modalCerrar && (
        <ModalConfirm
          titulo="Cobrar y Liberar Mesa"
          mensaje={`¿Confirmar pago y liberar Mesa ${modalCerrar.numero}? El total es ${formatCOP(totalMesa(modalCerrar.id_mesa))}.`}
          labelConfirmar="💳 Confirmar Pago"
          colorConfirmar="#2D6A4F"
          onConfirmar={confirmarCerrarMesa}
          onCancelar={() => setModalCerrar(null)}
        />
      )}
    </div>
  );
};

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  titulo: { margin: 0, color: '#fff', fontSize: '22px' },
  btnRefresh: { padding: '8px 16px', backgroundColor: '#16213e', color: '#ccc', border: '1px solid #2D6A4F', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' },
  kpiCard: { backgroundColor: '#16213e', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' },
  kpiLabel: { color: '#888', fontSize: '13px', fontWeight: '600' },
  kpiValor: { color: '#fff', fontSize: '28px', fontWeight: '700' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' },
  card: { backgroundColor: '#16213e', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  mesaNumero: { margin: 0, color: '#fff', fontSize: '20px', fontWeight: '700' },
  estadoBadge: { padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', color: '#fff' },
  pedidosLista: { display: 'flex', flexDirection: 'column', gap: '8px' },
  pedidoItem: { backgroundColor: '#0f3460', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px' },
  pedidoHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '4px' },
  pedidoId: { color: '#888', fontSize: '12px' },
  pedidoEstado: { fontSize: '12px', fontWeight: '700' },
  pedidoProducto: { color: '#ccc', fontSize: '13px' },
  totalMesa: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid #0f3460' },
  totalLabel: { color: '#888', fontSize: '14px' },
  totalValor: { color: '#4CAF50', fontSize: '18px', fontWeight: '700' },
  sinPedidos: { color: '#555', fontSize: '14px', textAlign: 'center', margin: '8px 0' },
  btnCerrar: { width: '100%', padding: '12px', backgroundColor: '#E53935', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px', minHeight: '44px' },

  // Método de pago en tarjeta
  pagoRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' },
  pagoBadge: { padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', color: '#fff' },
  pagoSinDefinir: { color: '#555', fontSize: '12px', fontStyle: 'italic' },
  btnEditarPago: { background: 'none', border: 'none', color: '#888', fontSize: '12px', cursor: 'pointer', padding: '2px 4px' },
  pagoEditor: { display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px', backgroundColor: '#16213e', borderRadius: '8px', padding: '8px' },
  pagoEditorLabel: { color: '#ccc', fontSize: '11px', fontWeight: '600' },
  pagoEditorBotones: { display: 'flex', gap: '6px' },
  pagoEditorBtn: { flex: 1, padding: '6px 2px', border: '1px solid', borderRadius: '6px', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '11px', fontWeight: '600' },
  btnCancelarPago: { background: 'none', border: 'none', color: '#888', fontSize: '11px', cursor: 'pointer', alignSelf: 'center' },
  meseroRow: { marginTop: '4px' },
  meseroBadge: { backgroundColor: 'rgba(45,106,79,0.2)', color: '#4CAF50', border: '1px solid #2D6A4F', borderRadius: '10px', padding: '2px 10px', fontSize: '12px', fontWeight: '600' },
};

export default MonitorMesas;