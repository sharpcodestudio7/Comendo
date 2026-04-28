// src/components/admin/Dashboard.jsx
// Dashboard administrativo con métricas de exclusiones de ingredientes.

import { useState, useEffect } from 'react';
import { supabase } from '../../api/supabase';
import { exportarVentas } from '../../api/exportService';

const Dashboard = () => {
  const [metricas, setMetricas] = useState(null);
  const [pedidosCompletos, setPedidosCompletos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarMetricas();
  }, []);

  const cargarMetricas = async () => {
    setCargando(true);

    // ── 1. Total de ventas y número de pedidos ────────────────────────────
    const { data: pedidos } = await supabase
      .from('pedidos')
      .select('total, estado_actual, fecha_creacion')
      .eq('estado_actual', 'Listo');

    const totalVentas = pedidos?.reduce((acc, p) => acc + p.total, 0) || 0;
    const totalPedidos = pedidos?.length || 0;
    const ticketPromedio = totalPedidos > 0 ? totalVentas / totalPedidos : 0;

    // ── 2. Productos más vendidos ─────────────────────────────────────────
    const { data: detalles } = await supabase
      .from('detalle_pedidos')
      .select('cantidad, productos ( nombre )');

    const ventasPorProducto = {};
    detalles?.forEach(({ cantidad, productos }) => {
      const nombre = productos?.nombre;
      if (nombre) {
        ventasPorProducto[nombre] = (ventasPorProducto[nombre] || 0) + cantidad;
      }
    });

    const productosRanking = Object.entries(ventasPorProducto)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    // ── 3. Inventario crítico ─────────────────────────────────────────────
    const { data: insumos } = await supabase
      .from('insumos')
      .select('nombre, cantidad_stock, unidad_medida')
      .order('cantidad_stock', { ascending: true })
      .limit(5);

    // ── 4. Pedidos por estado ─────────────────────────────────────────────
    const { data: todosPedidos } = await supabase
      .from('pedidos')
      .select('estado_actual');

    const pedidosPorEstado = { Recibido: 0, Preparando: 0, Listo: 0, Entregado: 0 };
    todosPedidos?.forEach(({ estado_actual }) => {
      if (pedidosPorEstado[estado_actual] !== undefined) {
        pedidosPorEstado[estado_actual]++;
      }
    });

    // ── 5. Ingredientes más excluidos (NUEVO) ─────────────────────────────
    const { data: exclusiones } = await supabase
      .from('exclusiones_pedido')
      .select('nombre_insumo, cantidad_no_descontada, unidad_medida');

    const exclusionesPorInsumo = {};
    exclusiones?.forEach(({ nombre_insumo, cantidad_no_descontada, unidad_medida }) => {
      if (!exclusionesPorInsumo[nombre_insumo]) {
        exclusionesPorInsumo[nombre_insumo] = { veces: 0, cantidadAhorrada: 0, unidad: unidad_medida };
      }
      exclusionesPorInsumo[nombre_insumo].veces += 1;
      exclusionesPorInsumo[nombre_insumo].cantidadAhorrada += Number(cantidad_no_descontada);
    });

    const exclusionesRanking = Object.entries(exclusionesPorInsumo)
      .map(([nombre, data]) => ({ nombre, ...data }))
      .sort((a, b) => b.veces - a.veces)
      .slice(0, 5);

    const totalExclusiones = exclusiones?.length || 0;

    // ── 6. Pedidos completos para exportar (ahora con exclusiones y notas) ─
    const { data: pedidosExport } = await supabase
      .from('pedidos')
      .select(`
        id_pedido,
        total,
        estado_actual,
        fecha_creacion,
        mesas ( numero ),
        detalle_pedidos (
          cantidad,
          precio_unitario,
          subtotal,
          notas,
          productos ( nombre ),
          exclusiones_pedido (
            nombre_insumo
          )
        )
      `)
      .order('fecha_creacion', { ascending: false });

    setPedidosCompletos(pedidosExport || []);
    setMetricas({
      totalVentas, totalPedidos, ticketPromedio,
      productosRanking, insumos: insumos || [],
      pedidosPorEstado, exclusionesRanking, totalExclusiones,
    });
    setCargando(false);
  };

  const formatCOP = (valor) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor);

  if (cargando) return <p style={{ color: '#fff' }}>Cargando métricas...</p>;

  return (
    <div style={styles.pagina}>

      {/* Header con botón exportar */}
      <div style={styles.header}>
        <h2 style={styles.titulo}>📊 Dashboard</h2>
        <button
          style={styles.btnExportar}
          onClick={() => exportarVentas(pedidosCompletos)}
        >
          ⬇ Exportar Ventas Excel
        </button>
      </div>

      {/* KPIs */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <span style={styles.kpiLabel}>Total Ventas</span>
          <span style={styles.kpiValor}>{formatCOP(metricas.totalVentas)}</span>
        </div>
        <div style={styles.kpiCard}>
          <span style={styles.kpiLabel}>Total Pedidos</span>
          <span style={styles.kpiValor}>{metricas.totalPedidos}</span>
        </div>
        <div style={styles.kpiCard}>
          <span style={styles.kpiLabel}>Ticket Promedio</span>
          <span style={styles.kpiValor}>{formatCOP(metricas.ticketPromedio)}</span>
        </div>
        <div style={styles.kpiCard}>
          <span style={styles.kpiLabel}>Pedidos Hoy</span>
          <span style={styles.kpiValor}>
            {metricas.pedidosPorEstado.Recibido +
             metricas.pedidosPorEstado.Preparando +
             metricas.pedidosPorEstado.Listo}
          </span>
        </div>
      </div>

      <div style={styles.seccionGrid}>

        {/* Productos más vendidos */}
        <div style={styles.seccion}>
          <h3 style={styles.seccionTitulo}>🏆 Productos Más Vendidos</h3>
          {metricas.productosRanking.length === 0 ? (
            <p style={styles.vacio}>Sin datos de ventas aún</p>
          ) : (
            metricas.productosRanking.map((p, i) => {
              const maxCantidad = metricas.productosRanking[0].cantidad;
              const porcentaje = (p.cantidad / maxCantidad) * 100;
              return (
                <div key={p.nombre} style={styles.rankingItem}>
                  <div style={styles.rankingHeader}>
                    <span style={styles.rankingNombre}>{i + 1}. {p.nombre}</span>
                    <span style={styles.rankingCantidad}>{p.cantidad} uds</span>
                  </div>
                  <div style={styles.barraFondo}>
                    <div style={{
                      ...styles.barraRelleno,
                      width: `${porcentaje}%`,
                      backgroundColor: i === 0 ? '#FFD700' : '#2D6A4F',
                    }} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Inventario crítico */}
        <div style={styles.seccion}>
          <h3 style={styles.seccionTitulo}>⚠️ Inventario — Stock más bajo</h3>
          {metricas.insumos.length === 0 ? (
            <p style={styles.vacio}>Sin datos de inventario</p>
          ) : (
            metricas.insumos.map((insumo) => {
              const stockBajo = insumo.cantidad_stock < 1000;
              return (
                <div key={insumo.nombre} style={{
                  ...styles.insumoItem,
                  borderLeft: `4px solid ${stockBajo ? '#E53935' : '#2D6A4F'}`,
                }}>
                  <span style={styles.insumoNombre}>{insumo.nombre}</span>
                  <span style={{ ...styles.insumoStock, color: stockBajo ? '#E53935' : '#4CAF50' }}>
                    {insumo.cantidad_stock} {insumo.unidad_medida}{stockBajo && ' ⚠️'}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Pedidos por estado */}
        <div style={styles.seccion}>
          <h3 style={styles.seccionTitulo}>📋 Pedidos por Estado</h3>
          {Object.entries(metricas.pedidosPorEstado).map(([estado, cantidad]) => {
            const colores = { Recibido: '#E53935', Preparando: '#F57C00', Listo: '#2D6A4F', Entregado: '#1565C0' };
            return (
              <div key={estado} style={styles.estadoItem}>
                <span style={{ ...styles.estadoBadge, backgroundColor: colores[estado] }}>{estado}</span>
                <span style={styles.estadoCantidad}>{cantidad} pedidos</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── NUEVA SECCIÓN: Ingredientes más excluidos ──────────────────── */}
      <div style={{ ...styles.seccionGrid, gridTemplateColumns: '1fr 1fr', marginTop: '20px' }}>
        <div style={styles.seccion}>
          <h3 style={styles.seccionTitulo}>🚫 Ingredientes Más Excluidos</h3>
          <p style={styles.seccionSubtitulo}>
            Los comensales han excluido ingredientes {metricas.totalExclusiones} veces en total
          </p>

          {metricas.exclusionesRanking.length === 0 ? (
            <p style={styles.vacio}>Sin exclusiones registradas aún</p>
          ) : (
            metricas.exclusionesRanking.map((exc, i) => {
              const maxVeces = metricas.exclusionesRanking[0].veces;
              const porcentaje = (exc.veces / maxVeces) * 100;
              return (
                <div key={exc.nombre} style={styles.rankingItem}>
                  <div style={styles.rankingHeader}>
                    <span style={styles.rankingNombre}>{i + 1}. {exc.nombre}</span>
                    <span style={styles.exclusionVeces}>{exc.veces} veces</span>
                  </div>
                  <div style={styles.rankingHeader}>
                    <span style={styles.exclusionAhorro}>
                      Ahorro en inventario: {Math.round(exc.cantidadAhorrada)} {exc.unidad}
                    </span>
                  </div>
                  <div style={styles.barraFondo}>
                    <div style={{
                      ...styles.barraRelleno,
                      width: `${porcentaje}%`,
                      backgroundColor: '#E53935',
                    }} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Notas recientes de comensales */}
        <div style={styles.seccion}>
          <h3 style={styles.seccionTitulo}>📝 Notas Recientes de Comensales</h3>
          <p style={styles.seccionSubtitulo}>
            Últimas personalizaciones solicitadas por los clientes
          </p>

          {(() => {
            // Extraer las notas de los pedidos completos
            const notasRecientes = pedidosCompletos
              .flatMap((pedido) =>
                (pedido.detalle_pedidos || [])
                  .filter((d) => d.notas && d.notas.trim())
                  .map((d) => ({
                    producto: d.productos?.nombre || 'Producto',
                    nota: d.notas,
                    mesa: pedido.mesas?.numero ?? '—',
                    fecha: new Date(pedido.fecha_creacion).toLocaleDateString('es-CO'),
                    exclusiones: (d.exclusiones_pedido || []).map((e) => e.nombre_insumo),
                  }))
              )
              .slice(0, 6);

            if (notasRecientes.length === 0) {
              return <p style={styles.vacio}>Sin notas de comensales aún</p>;
            }

            return notasRecientes.map((item, i) => (
              <div key={i} style={styles.notaItem}>
                <div style={styles.notaHeader}>
                  <span style={styles.notaProducto}>{item.producto}</span>
                  <span style={styles.notaMeta}>Mesa {item.mesa} · {item.fecha}</span>
                </div>

                {/* Exclusiones del producto */}
                {item.exclusiones.length > 0 && (
                  <div style={styles.notaExclusiones}>
                    <span style={styles.notaExcLabel}>SIN:</span>
                    {item.exclusiones.map((exc, j) => (
                      <span key={j} style={styles.notaExcChip}>{exc}</span>
                    ))}
                  </div>
                )}

                {/* Texto de la nota */}
                <div style={styles.notaTextoContainer}>
                  <span style={styles.notaTexto}>"{item.nota}"</span>
                </div>
              </div>
            ));
          })()}
        </div>
      </div>
    </div>
  );
};

const styles = {
  pagina: { color: '#fff', fontFamily: 'Arial, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  titulo: { margin: 0, fontSize: '22px' },
  btnExportar: { padding: '10px 20px', backgroundColor: '#1565C0', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '15px' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' },
  kpiCard: { backgroundColor: '#16213e', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '3px solid #2D6A4F' },
  kpiLabel: { color: '#888', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' },
  kpiValor: { color: '#fff', fontSize: '24px', fontWeight: '700' },
  seccionGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' },
  seccion: { backgroundColor: '#16213e', borderRadius: '12px', padding: '20px' },
  seccionTitulo: { margin: '0 0 4px', fontSize: '16px', color: '#fff' },
  seccionSubtitulo: { margin: '0 0 16px', fontSize: '12px', color: '#888' },
  vacio: { color: '#555', fontSize: '14px', textAlign: 'center', marginTop: '20px' },
  rankingItem: { marginBottom: '16px' },
  rankingHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px' },
  rankingNombre: { color: '#ccc', fontSize: '14px' },
  rankingCantidad: { color: '#4CAF50', fontWeight: '700', fontSize: '14px' },
  barraFondo: { backgroundColor: '#0f3460', borderRadius: '4px', height: '8px', overflow: 'hidden' },
  barraRelleno: { height: '100%', borderRadius: '4px', transition: 'width 0.5s ease' },
  insumoItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#0f3460', borderRadius: '8px', marginBottom: '8px' },
  insumoNombre: { color: '#ccc', fontSize: '14px' },
  insumoStock: { fontSize: '14px', fontWeight: '700' },
  estadoItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #0f3460' },
  estadoBadge: { padding: '4px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: '600' },
  estadoCantidad: { color: '#ccc', fontSize: '14px' },

  // Exclusiones ranking
  exclusionVeces: { color: '#E53935', fontWeight: '700', fontSize: '14px' },
  exclusionAhorro: { color: '#888', fontSize: '12px' },

  // Notas recientes
  notaItem: { backgroundColor: '#0f3460', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '6px' },
  notaHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  notaProducto: { color: '#fff', fontWeight: '600', fontSize: '13px' },
  notaMeta: { color: '#888', fontSize: '11px' },
  notaExclusiones: { display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' },
  notaExcLabel: { color: '#ff1744', fontSize: '11px', fontWeight: '700' },
  notaExcChip: { backgroundColor: 'rgba(255,23,68,0.15)', color: '#ff8a80', border: '1px solid #ff1744', borderRadius: '10px', padding: '1px 8px', fontSize: '11px' },
  notaTextoContainer: { backgroundColor: 'rgba(255,167,38,0.1)', border: '1px solid rgba(255,167,38,0.3)', borderRadius: '6px', padding: '4px 8px' },
  notaTexto: { color: '#ffcc80', fontSize: '12px', fontStyle: 'italic' },
};

export default Dashboard;