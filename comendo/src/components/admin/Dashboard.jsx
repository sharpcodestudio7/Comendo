import { useState, useEffect } from 'react';
import { supabase } from '../../api/supabase';
import { exportarVentas } from '../../api/exportService';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { BarChart2, Download, AlertTriangle, Unlock } from 'lucide-react';

const ESTADOS_VALIDOS = ['Listo', 'Entregado', 'Pagado'];

const DASH_CSS = `
  .dash-periodo-btn {
    transition: all 0.2s ease;
    padding: 6px 14px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    font-family: sans-serif;
  }
  .dash-periodo-activo { background-color: #B87333 !important; color: #000 !important; }
  .dash-periodo-inactivo { background-color: #2A2A2A !important; color: #999 !important; }
  .dash-periodo-inactivo:hover { background-color: #333 !important; color: #CCC !important; }
  .dash-tab {
    padding: 8px 14px;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    transition: all 0.2s ease;
    font-family: sans-serif;
  }
  .dash-tab-activo { color: #B87333 !important; border-bottom: 2px solid #B87333 !important; }
  .dash-tab-inactivo { color: #666 !important; border-bottom: 2px solid transparent !important; }
  .dash-btn-export:hover { background-color: rgba(184,115,51,0.1) !important; }
  .dash-estado-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
  .dash-estado-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
  @media (max-width: 1024px) {
    .dash-grid-4 { grid-template-columns: 1fr 1fr !important; }
    .dash-grid-3 { grid-template-columns: 1fr 1fr !important; }
    .dash-grid-2 { grid-template-columns: 1fr !important; }
    .dash-grid-5 { grid-template-columns: repeat(3, 1fr) !important; }
  }
  @media (max-width: 640px) {
    .dash-grid-4 { grid-template-columns: 1fr !important; }
    .dash-grid-3 { grid-template-columns: 1fr !important; }
    .dash-grid-5 { grid-template-columns: 1fr 1fr !important; }
    .dash-header-row { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
  }
`;

const formatCOP = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0);

const calcDiff = (actual, anterior) => {
  if (!anterior) return { pct: null, subio: null };
  const pct = Math.round(((actual - anterior) / anterior) * 100);
  return { pct: Math.abs(pct), subio: pct >= 0 };
};

const calcRanking = (pedidos, desde = null) => {
  const mapa = {};
  pedidos?.forEach(({ fecha_creacion, detalle_pedidos }) => {
    if (desde && new Date(fecha_creacion) < new Date(desde)) return;
    (detalle_pedidos || []).forEach(({ cantidad, productos }) => {
      const n = productos?.nombre;
      if (n) mapa[n] = (mapa[n] || 0) + cantidad;
    });
  });
  return Object.entries(mapa)
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5);
};

const calcTendencia = (pedidos) => {
  const hoy = new Date();
  const dias = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - i);
    dias[`${d.getDate()}/${d.getMonth() + 1}`] = 0;
  }
  pedidos?.forEach(({ total, fecha_creacion }) => {
    const d = new Date(fecha_creacion);
    const k = `${d.getDate()}/${d.getMonth() + 1}`;
    if (k in dias) dias[k] += total;
  });
  return Object.entries(dias).map(([dia, ventas]) => ({ dia, ventas }));
};

const MEDALLAS = ['#FFD700', '#C0C0C0', '#CD7F32'];
const PIE_COLORS = ['#B87333', '#4A90D9'];

const TooltipVentas = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ backgroundColor: '#2A2A2A', border: '1px solid #333', borderRadius: '8px', padding: '10px 14px' }}>
      <p style={{ color: '#999', fontSize: '12px', margin: '0 0 4px' }}>{label}</p>
      <p style={{ color: '#B87333', fontWeight: 700, margin: 0 }}>{formatCOP(payload[0].value)}</p>
    </div>
  );
};

const KPICard = ({ label, valor, comp, compLabel, colorValor }) => (
  <div style={styles.kpiCard}>
    <span style={styles.kpiLabel}>{label}</span>
    <span style={{ ...styles.kpiValor, color: colorValor }}>{valor}</span>
    {comp.pct !== null ? (
      <span style={{ fontSize: '12px', color: comp.subio ? '#4CAF50' : '#ff4444' }}>
        {comp.subio ? '↑' : '↓'} {comp.pct}% {compLabel}
      </span>
    ) : (
      <span style={{ fontSize: '12px', color: '#555' }}>— {compLabel}</span>
    )}
  </div>
);

const Dashboard = () => {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [periodo, setPeriodo] = useState('hoy');
  const [tabProductos, setTabProductos] = useState('hoy');
  const [pedidosCompletos, setPedidosCompletos] = useState([]);
  const [liberandoMesas, setLiberandoMesas] = useState(false);
  const [resultadoLiberar, setResultadoLiberar] = useState(null); // { liberadas: N } | null

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    setCargando(true);
    const ahora = new Date();
    const y = ahora.getFullYear(), m = ahora.getMonth(), d = ahora.getDate();
    const inicioHoy       = new Date(y, m, d).toISOString();
    const inicioAyer      = new Date(y, m, d - 1).toISOString();
    const dow             = ahora.getDay();
    const inicioSemana    = new Date(y, m, d - dow).toISOString();
    const inicioSemPas    = new Date(y, m, d - dow - 7).toISOString();
    const inicioMes       = new Date(y, m, 1).toISOString();
    const inicioMesPas    = new Date(y, m - 1, 1).toISOString();
    const hace30Dias      = new Date(y, m, d - 30).toISOString();

    const [
      { data: pedHoy },
      { data: pedAyer },
      { data: pedSemana },
      { data: pedSemPas },
      { data: pedMes },
      { data: pedMesPas },
      { data: pedTend },
      { data: todosPed },
      { data: pedMesDet },
      { data: insumos },
      { data: todosInsumos },
      { data: exclusiones },
      { data: pedExport },
    ] = await Promise.all([
      supabase.from('pedidos').select('total, metodo_pago').in('estado_actual', ESTADOS_VALIDOS).gte('fecha_creacion', inicioHoy),
      supabase.from('pedidos').select('total').in('estado_actual', ESTADOS_VALIDOS).gte('fecha_creacion', inicioAyer).lt('fecha_creacion', inicioHoy),
      supabase.from('pedidos').select('total').in('estado_actual', ESTADOS_VALIDOS).gte('fecha_creacion', inicioSemana),
      supabase.from('pedidos').select('total').in('estado_actual', ESTADOS_VALIDOS).gte('fecha_creacion', inicioSemPas).lt('fecha_creacion', inicioSemana),
      supabase.from('pedidos').select('total').in('estado_actual', ESTADOS_VALIDOS).gte('fecha_creacion', inicioMes),
      supabase.from('pedidos').select('total').in('estado_actual', ESTADOS_VALIDOS).gte('fecha_creacion', inicioMesPas).lt('fecha_creacion', inicioMes),
      supabase.from('pedidos').select('total, fecha_creacion').in('estado_actual', ESTADOS_VALIDOS).gte('fecha_creacion', hace30Dias).order('fecha_creacion', { ascending: true }),
      supabase.from('pedidos').select('estado_actual'),
      supabase.from('pedidos').select('fecha_creacion, detalle_pedidos ( cantidad, productos ( nombre ) )').in('estado_actual', ESTADOS_VALIDOS).gte('fecha_creacion', inicioMes),
      supabase.from('insumos').select('nombre, cantidad_stock, unidad_medida').order('cantidad_stock', { ascending: true }).limit(5),
      supabase.from('insumos').select('cantidad_stock'),
      supabase.from('exclusiones_pedido').select('nombre_insumo, cantidad_no_descontada, unidad_medida'),
      supabase.from('pedidos').select(`
        id_pedido, total, estado_actual, fecha_creacion, metodo_pago,
        mesas ( numero ),
        detalle_pedidos (
          cantidad, precio_unitario, subtotal, notas,
          productos ( nombre ),
          exclusiones_pedido ( nombre_insumo )
        )
      `).order('fecha_creacion', { ascending: false }),
    ]);

    const sum = (arr) => arr?.reduce((a, p) => a + (p.total || 0), 0) || 0;

    const vHoy = sum(pedHoy), vAyer = sum(pedAyer);
    const vSem = sum(pedSemana), vSemP = sum(pedSemPas);
    const vMes = sum(pedMes), vMesP = sum(pedMesPas);

    const nHoy = pedHoy?.length || 0, nAyer = pedAyer?.length || 0;
    const nSem = pedSemana?.length || 0, nSemP = pedSemPas?.length || 0;
    const nMes = pedMes?.length || 0, nMesP = pedMesPas?.length || 0;

    const tk = (v, n) => n > 0 ? v / n : 0;

    const distPagos = { efectivo: 0, tarjeta: 0 };
    pedExport?.forEach(({ metodo_pago }) => {
      if (!metodo_pago) return;
      if (metodo_pago === 'efectivo') distPagos.efectivo++;
      else distPagos.tarjeta++;
    });

    const pedEstado = { Recibido: 0, Preparando: 0, Listo: 0, Entregado: 0, Pagado: 0 };
    todosPed?.forEach(({ estado_actual }) => {
      if (estado_actual in pedEstado) pedEstado[estado_actual]++;
    });

    const excMapa = {};
    exclusiones?.forEach(({ nombre_insumo, cantidad_no_descontada, unidad_medida }) => {
      if (!excMapa[nombre_insumo]) excMapa[nombre_insumo] = { veces: 0, cantidadAhorrada: 0, unidad: unidad_medida };
      excMapa[nombre_insumo].veces++;
      excMapa[nombre_insumo].cantidadAhorrada += Number(cantidad_no_descontada);
    });
    const exclusionesRanking = Object.entries(excMapa)
      .map(([nombre, data]) => ({ nombre, ...data }))
      .sort((a, b) => b.veces - a.veces)
      .slice(0, 5);

    const promedioStock = todosInsumos?.length
      ? todosInsumos.reduce((a, i) => a + i.cantidad_stock, 0) / todosInsumos.length
      : 100;

    setPedidosCompletos(pedExport || []);
    setDatos({
      vHoy, vAyer, vSem, vSemP, vMes, vMesP,
      nHoy, nAyer, nSem, nSemP, nMes, nMesP,
      tkHoy: tk(vHoy, nHoy), tkAyer: tk(vAyer, nAyer),
      tkSem: tk(vSem, nSem), tkSemP: tk(vSemP, nSemP),
      tkMes: tk(vMes, nMes), tkMesP: tk(vMesP, nMesP),
      tendencia: calcTendencia(pedTend),
      productosHoy: calcRanking(pedMesDet, inicioHoy),
      productosMes: calcRanking(pedMesDet),
      distPagos, totalPagos: distPagos.efectivo + distPagos.tarjeta,
      insumos: insumos || [], promedioStock,
      pedEstado, exclusionesRanking,
      totalExclusiones: exclusiones?.length || 0,
    });
    setCargando(false);
  };

  const liberarMesasSinPedido = async () => {
    setLiberandoMesas(true);
    setResultadoLiberar(null);

    // 1. Mesas con pedidos activos (no se pueden liberar)
    const { data: pedidosActivos } = await supabase
      .from('pedidos')
      .select('id_mesa')
      .in('estado_actual', ['Recibido', 'Preparando', 'Listo', 'Entregado']);

    const mesasOcupadas = [...new Set((pedidosActivos || []).map((p) => p.id_mesa))];

    // 2. Liberar mesas con token activo y sin pedido en curso
    let query = supabase
      .from('mesas')
      .update({ token_sesion_actual: null, token_creado_en: null, estado: 'Libre' })
      .not('token_sesion_actual', 'is', null)
      .select('id_mesa');

    if (mesasOcupadas.length > 0) {
      query = query.not('id_mesa', 'in', `(${mesasOcupadas.join(',')})`);
    }

    const { data, error } = await query;
    setLiberandoMesas(false);

    if (!error) {
      setResultadoLiberar({ liberadas: data?.length || 0 });
      setTimeout(() => setResultadoLiberar(null), 5000);
    }
  };

  if (cargando) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px', color: '#666' }}>
      Cargando dashboard...
    </div>
  );

  const dt = datos;

  const kpiMap = {
    hoy:    { ventas: dt.vHoy,  ventasC: dt.vAyer,  n: dt.nHoy, nC: dt.nAyer, tk: dt.tkHoy, tkC: dt.tkAyer, compLabel: 'vs ayer',          ventasLabel: 'Ventas Hoy',          nLabel: 'Pedidos Hoy' },
    semana: { ventas: dt.vSem,  ventasC: dt.vSemP,  n: dt.nSem, nC: dt.nSemP, tk: dt.tkSem, tkC: dt.tkSemP, compLabel: 'vs semana pasada',  ventasLabel: 'Ventas Esta Semana',  nLabel: 'Pedidos Esta Semana' },
    mes:    { ventas: dt.vMes,  ventasC: dt.vMesP,  n: dt.nMes, nC: dt.nMesP, tk: dt.tkMes, tkC: dt.tkMesP, compLabel: 'vs mes pasado',     ventasLabel: 'Ventas Este Mes',     nLabel: 'Pedidos Este Mes' },
  };
  const kpi = kpiMap[periodo];

  const pieData = [
    { name: 'Efectivo', value: dt.distPagos.efectivo },
    { name: 'Tarjeta',  value: dt.distPagos.tarjeta },
  ];

  const productosActuales = tabProductos === 'hoy' ? dt.productosHoy : dt.productosMes;

  const ESTADOS_CONFIG = [
    { key: 'Recibido',   color: '#ff4444' },
    { key: 'Preparando', color: '#FFB300' },
    { key: 'Listo',      color: '#4CAF50' },
    { key: 'Entregado',  color: '#4A90D9' },
    { key: 'Pagado',     color: '#B87333' },
  ];

  return (
    <>
      <style>{DASH_CSS}</style>
      <div style={styles.pagina}>

        {/* ── Header ──────────────────────────────────────── */}
        <div className="dash-header-row admin-fade-in" style={styles.header}>
          <div style={styles.headerIzq}>
            <BarChart2 size={22} color="#B87333" />
            <h2 style={styles.titulo}>Dashboard</h2>
          </div>
          <div style={styles.headerDer}>
            <div style={styles.periodoGroup}>
              {[['hoy', 'Hoy'], ['semana', 'Esta Semana'], ['mes', 'Este Mes']].map(([key, label]) => (
                <button
                  key={key}
                  className={`dash-periodo-btn ${periodo === key ? 'dash-periodo-activo' : 'dash-periodo-inactivo'}`}
                  onClick={() => setPeriodo(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              style={{
                ...styles.btnExportar,
                borderColor: liberandoMesas ? '#555' : '#C8A84E',
                color: liberandoMesas ? '#555' : '#C8A84E',
                cursor: liberandoMesas ? 'not-allowed' : 'pointer',
                opacity: liberandoMesas ? 0.7 : 1,
              }}
              onClick={liberarMesasSinPedido}
              disabled={liberandoMesas}
              title="Libera las mesas que tienen sesión activa pero aún no han hecho ningún pedido"
            >
              <Unlock size={14} />
              {liberandoMesas ? 'Liberando...' : 'Liberar mesas sin pedido'}
            </button>

            <button
              className="dash-btn-export"
              style={styles.btnExportar}
              onClick={() => exportarVentas(pedidosCompletos)}
            >
              <Download size={14} />
              Exportar Excel
            </button>
          </div>
        </div>

        {/* Feedback liberar mesas */}
        {resultadoLiberar !== null && (
          <div style={styles.feedbackLiberar}>
            <Unlock size={15} color="#C8A84E" />
            {resultadoLiberar.liberadas === 0
              ? 'No había mesas con sesión activa sin pedido.'
              : `✅ ${resultadoLiberar.liberadas} mesa${resultadoLiberar.liberadas > 1 ? 's liberadas' : ' liberada'} correctamente.`}
          </div>
        )}

        {/* ── Sección 1: KPIs ─────────────────────────────── */}
        <div className="dash-grid-4 admin-fade-in" style={styles.kpiGrid}>
          <KPICard label={kpi.ventasLabel}  valor={formatCOP(kpi.ventas)} comp={calcDiff(kpi.ventas, kpi.ventasC)} compLabel={kpi.compLabel} colorValor="#B87333" />
          <KPICard label="Ventas del Mes"   valor={formatCOP(dt.vMes)}    comp={calcDiff(dt.vMes, dt.vMesP)}       compLabel="vs mes pasado" colorValor="#B87333" />
          <KPICard label={kpi.nLabel}       valor={kpi.n}                 comp={calcDiff(kpi.n, kpi.nC)}           compLabel={kpi.compLabel} colorValor="#FFFFFF" />
          <KPICard label="Ticket Promedio"  valor={formatCOP(kpi.tk)}     comp={calcDiff(kpi.tk, kpi.tkC)}         compLabel={kpi.compLabel} colorValor="#B87333" />
        </div>

        {/* ── Sección 2: Gráfica de tendencia ─────────────── */}
        <div className="admin-fade-in" style={styles.panel}>
          <h3 style={styles.panelTitulo}>Tendencia de ventas — últimos 30 días</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dt.tendencia} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradVentas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#B87333" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#B87333" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#222" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="dia" stroke="#444" fontSize={11} tick={{ fill: '#666' }} tickLine={false} axisLine={false} interval={4} />
              <YAxis stroke="#444" fontSize={11} tick={{ fill: '#666' }} tickLine={false} axisLine={false} tickFormatter={(v) => v > 0 ? `$${(v / 1000).toFixed(0)}k` : '0'} width={50} />
              <Tooltip content={<TooltipVentas />} />
              <Area type="monotone" dataKey="ventas" stroke="#B87333" strokeWidth={2} fill="url(#gradVentas)" dot={false} activeDot={{ r: 5, fill: '#B87333', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ── Sección 3: 3 paneles ──────────────────────────── */}
        <div className="dash-grid-3 admin-fade-in" style={styles.grid3}>

          {/* Productos Estrella */}
          <div style={styles.panel}>
            <div style={styles.tabsRow}>
              <h3 style={{ ...styles.panelTitulo, marginBottom: 0 }}>Productos Estrella</h3>
              <div>
                {[['hoy', 'Hoy'], ['mes', 'Este Mes']].map(([key, label]) => (
                  <button
                    key={key}
                    className={`dash-tab ${tabProductos === key ? 'dash-tab-activo' : 'dash-tab-inactivo'}`}
                    onClick={() => setTabProductos(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {productosActuales.length === 0 ? (
              <p style={styles.vacio}>Sin ventas registradas</p>
            ) : (
              <div style={{ marginTop: '16px' }}>
                {productosActuales.map((p, i) => {
                  const pct = (p.cantidad / productosActuales[0].cantidad) * 100;
                  return (
                    <div key={p.nombre} style={styles.rankingItem}>
                      <div style={styles.rankingRow}>
                        <span style={{ color: MEDALLAS[i] || '#FFFFFF', fontWeight: 700, fontSize: '13px', minWidth: '22px' }}>#{i + 1}</span>
                        <span style={{ color: '#E0E0E0', fontSize: '13px', flex: 1 }}>{p.nombre}</span>
                        <span style={{ color: '#B87333', fontWeight: 700, fontSize: '13px' }}>{p.cantidad} uds</span>
                      </div>
                      <div style={styles.barraFondo}>
                        <div style={{ ...styles.barraRelleno, width: `${pct}%`, backgroundColor: '#B87333' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Métodos de pago */}
          <div style={styles.panel}>
            <h3 style={styles.panelTitulo}>Distribución de pagos</h3>
            {dt.totalPagos === 0 ? (
              <p style={styles.vacio}>Sin datos de pago</p>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <PieChart width={180} height={180}>
                    <Pie data={pieData} cx={85} cy={85} innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {pieData.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => [`${v} pedidos`]}
                      contentStyle={{ backgroundColor: '#2A2A2A', border: '1px solid #333', borderRadius: '8px', color: '#FFF', fontSize: '13px' }}
                    />
                  </PieChart>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                  {pieData.map((item, idx) => {
                    const pct = Math.round((item.value / dt.totalPagos) * 100);
                    return (
                      <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: PIE_COLORS[idx] }} />
                          <span style={{ color: '#E0E0E0', fontSize: '13px' }}>{item.name}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ color: PIE_COLORS[idx], fontWeight: 700, fontSize: '14px' }}>{item.value}</span>
                          <span style={{ color: '#666', fontSize: '12px' }}>{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Inventario crítico */}
          <div style={styles.panel}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <AlertTriangle size={16} color="#FFB300" />
              <h3 style={{ ...styles.panelTitulo, marginBottom: 0 }}>Inventario bajo</h3>
            </div>
            {dt.insumos.length === 0 ? (
              <p style={styles.vacio}>Sin datos de inventario</p>
            ) : (
              dt.insumos.map((insumo) => {
                const ratio = dt.promedioStock > 0 ? insumo.cantidad_stock / dt.promedioStock : 0;
                const esCritico = ratio < 0.25;
                const esBajo = ratio < 0.5;
                const color = esCritico ? '#ff4444' : esBajo ? '#FFB300' : '#4CAF50';
                const bg    = esCritico ? 'rgba(255,68,68,0.08)' : esBajo ? 'rgba(255,179,0,0.08)' : 'rgba(76,175,80,0.05)';
                const barPct = Math.min(100, Math.round(ratio * 100));
                return (
                  <div key={insumo.nombre} style={{ ...styles.insumoItem, backgroundColor: bg }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ color: '#FFFFFF', fontSize: '13px' }}>{insumo.nombre}</span>
                      <span style={{ color, fontWeight: 700, fontSize: '13px' }}>{insumo.cantidad_stock} {insumo.unidad_medida}</span>
                    </div>
                    <div style={{ backgroundColor: '#333', borderRadius: '2px', height: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${barPct}%`, height: '100%', backgroundColor: color, borderRadius: '2px', transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Sección 4: Exclusiones + Notas ───────────────── */}
        <div className="dash-grid-2 admin-fade-in" style={styles.grid2}>

          {/* Exclusiones */}
          <div style={styles.panel}>
            <h3 style={styles.panelTitulo}>Ingredientes más excluidos</h3>
            <p style={styles.panelSub}>{dt.totalExclusiones} exclusiones registradas en total</p>
            {dt.exclusionesRanking.length === 0 ? (
              <p style={styles.vacio}>Sin exclusiones registradas</p>
            ) : (
              dt.exclusionesRanking.map((exc, i) => {
                const pct = (exc.veces / dt.exclusionesRanking[0].veces) * 100;
                return (
                  <div key={exc.nombre} style={styles.rankingItem}>
                    <div style={styles.rankingRow}>
                      <span style={{ color: '#ff6b6b', fontWeight: 700, fontSize: '13px', minWidth: '22px' }}>#{i + 1}</span>
                      <span style={{ color: '#E0E0E0', fontSize: '13px', flex: 1 }}>{exc.nombre}</span>
                      <span style={{ color: '#ff6b6b', fontWeight: 700, fontSize: '13px' }}>{exc.veces}x</span>
                    </div>
                    <p style={{ color: '#555', fontSize: '11px', margin: '2px 0 6px 22px' }}>
                      Ahorro: {Math.round(exc.cantidadAhorrada)} {exc.unidad}
                    </p>
                    <div style={styles.barraFondo}>
                      <div style={{ ...styles.barraRelleno, width: `${pct}%`, backgroundColor: '#8B1A1A' }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Notas recientes */}
          <div style={styles.panel}>
            <h3 style={styles.panelTitulo}>Notas recientes de comensales</h3>
            <p style={styles.panelSub}>Últimas personalizaciones solicitadas</p>
            {(() => {
              const notas = pedidosCompletos
                .flatMap((p) =>
                  (p.detalle_pedidos || [])
                    .filter((det) => det.notas?.trim())
                    .map((det) => ({
                      producto: det.productos?.nombre || 'Producto',
                      nota: det.notas,
                      mesa: p.mesas?.numero ?? '—',
                      fecha: new Date(p.fecha_creacion).toLocaleDateString('es-CO'),
                      exclusiones: (det.exclusiones_pedido || []).map((e) => e.nombre_insumo),
                    }))
                )
                .slice(0, 6);

              if (!notas.length) return <p style={styles.vacio}>Sin notas registradas</p>;

              return notas.map((item, i) => (
                <div key={i} style={styles.notaItem}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#FFFFFF', fontWeight: 600, fontSize: '13px' }}>{item.producto}</span>
                    <span style={{ color: '#666', fontSize: '11px' }}>Mesa {item.mesa} · {item.fecha}</span>
                  </div>
                  {item.exclusiones.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                      <span style={{ color: '#ff6b6b', fontSize: '11px', fontWeight: 700 }}>SIN:</span>
                      {item.exclusiones.map((exc, j) => (
                        <span key={j} style={{ backgroundColor: 'rgba(139,26,26,0.2)', color: '#ff6b6b', borderRadius: '10px', padding: '1px 8px', fontSize: '11px' }}>{exc}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ backgroundColor: 'rgba(184,115,51,0.1)', border: '1px solid rgba(184,115,51,0.3)', borderRadius: '6px', padding: '5px 8px', marginTop: '4px' }}>
                    <span style={{ color: '#E8D5A0', fontSize: '12px', fontStyle: 'italic' }}>"{item.nota}"</span>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* ── Sección 5: Pedidos por estado ────────────────── */}
        <div className="admin-fade-in" style={styles.panel}>
          <h3 style={styles.panelTitulo}>Pedidos por estado</h3>
          <div className="dash-grid-5" style={styles.estadoGrid}>
            {ESTADOS_CONFIG.map(({ key, color }) => (
              <div key={key} className="dash-estado-card" style={{ ...styles.estadoCard, borderTop: `3px solid ${color}` }}>
                <span style={{ color, fontSize: '32px', fontWeight: 700, lineHeight: 1 }}>{dt.pedEstado[key]}</span>
                <span style={{ color: '#666', fontSize: '12px', letterSpacing: '0.5px', textTransform: 'uppercase', marginTop: '4px' }}>{key}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
};

const styles = {
  pagina: {
    display: 'flex', flexDirection: 'column', gap: '20px',
    color: '#FFFFFF', fontFamily: 'sans-serif', paddingBottom: '20px',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  headerIzq: { display: 'flex', alignItems: 'center', gap: '10px' },
  titulo: { margin: 0, fontSize: '22px', fontWeight: 700, color: '#FFFFFF' },
  headerDer: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  periodoGroup: { display: 'flex', gap: '4px' },
  btnExportar: {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '8px 16px', backgroundColor: 'transparent',
    border: '1px solid #B87333', color: '#B87333',
    borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
    transition: 'all 0.2s ease',
  },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' },
  kpiCard: {
    backgroundColor: '#1A1A1A', borderRadius: '12px', padding: '20px',
    border: '1px solid #333', display: 'flex', flexDirection: 'column', gap: '8px',
  },
  kpiLabel: { color: '#666', fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px' },
  kpiValor: { fontSize: '28px', fontWeight: 700, lineHeight: 1.1 },
  panel: { backgroundColor: '#1A1A1A', borderRadius: '12px', padding: '20px', border: '1px solid #333' },
  panelTitulo: { margin: '0 0 16px', fontSize: '15px', fontWeight: 600, color: '#FFFFFF' },
  panelSub: { margin: '-10px 0 14px', fontSize: '12px', color: '#666' },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  tabsRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '4px', borderBottom: '1px solid #222', paddingBottom: '4px',
  },
  rankingItem: { marginBottom: '12px' },
  rankingRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' },
  barraFondo: { backgroundColor: '#333', borderRadius: '3px', height: '6px', overflow: 'hidden' },
  barraRelleno: { height: '100%', borderRadius: '3px', transition: 'width 0.5s ease' },
  insumoItem: { borderRadius: '8px', padding: '10px 12px', marginBottom: '8px' },
  vacio: { color: '#555', fontSize: '14px', textAlign: 'center', marginTop: '20px', fontStyle: 'italic' },
  estadoGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginTop: '4px' },
  estadoCard: {
    backgroundColor: '#2A2A2A', borderRadius: '10px', padding: '20px 16px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'default',
  },
  notaItem: {
    backgroundColor: '#2A2A2A', borderRadius: '8px', padding: '10px 12px',
    marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '2px',
  },
  feedbackLiberar: {
    display: 'flex', alignItems: 'center', gap: '8px',
    backgroundColor: 'rgba(200,168,78,0.1)', border: '1px solid rgba(200,168,78,0.3)',
    borderRadius: '8px', padding: '10px 16px',
    color: '#C8A84E', fontSize: '13px', fontWeight: 500,
  },
};

export default Dashboard;
