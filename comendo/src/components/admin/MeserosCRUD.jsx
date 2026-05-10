// src/components/admin/MeserosCRUD.jsx
// Gestión de meseros: crear y ver historial de entregas.
// Los meseros NO necesitan cuenta de auth — se identifican por nombre en la app.

import { useState, useEffect } from 'react';
import { supabase } from '../../api/supabase';

const MeserosCRUD = () => {
  const [meseros, setMeseros]               = useState([]);
  const [cargando, setCargando]             = useState(true);
  const [mostrarForm, setMostrarForm]       = useState(false);
  const [guardando, setGuardando]           = useState(false);
  const [error, setError]                   = useState(null);
  const [exito, setExito]                   = useState(null);
  const [nombre, setNombre]                 = useState('');
  const [verDesactivados, setVerDesactivados] = useState(false);

  useEffect(() => { cargarMeseros(); }, [verDesactivados]);

  const cargarMeseros = async () => {
    setCargando(true);
    const { data } = await supabase
      .from('usuarios')
      .select('id_usuario, nombre')
      .eq('rol', 'Mesero')
      .eq('status_', verDesactivados ? 0 : 1)
      .order('nombre');
    setMeseros(data || []);
    setCargando(false);
  };

  const reactivarMesero = async (id) => {
    await supabase.from('usuarios').update({ status_: 1 }).eq('id_usuario', id);
    await cargarMeseros();
  };

  const crearMesero = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setGuardando(true);
    setError(null);
    setExito(null);

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
      await cargarMeseros();
    }
    setGuardando(false);
  };

  const eliminarMesero = async (id) => {
    await supabase.from('usuarios').update({ status_: 0 }).eq('id_usuario', id);
    await cargarMeseros();
  };

  return (
    <div>
      <div style={styles.header}>
        <h2 style={styles.titulo}>🛎 Meseros</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            style={{ ...styles.btnToggleVista, ...(verDesactivados ? styles.btnToggleVistaActivo : {}) }}
            onClick={() => { setVerDesactivados(!verDesactivados); setMostrarForm(false); }}
          >
            {verDesactivados ? '✅ Ver activos' : '🗂 Ver desactivados'}
          </button>
          {!verDesactivados && (
            <button
              style={styles.btnNuevo}
              onClick={() => { setMostrarForm(!mostrarForm); setError(null); setExito(null); }}
            >
              {mostrarForm ? '✕ Cancelar' : '+ Nuevo Mesero'}
            </button>
          )}
        </div>
      </div>

      {exito && <p style={styles.exito}>{exito}</p>}

      {/* Formulario */}
      {mostrarForm && (
        <form onSubmit={crearMesero} style={styles.form}>
          <h3 style={styles.formTitulo}>Agregar mesero</h3>
          <div style={styles.formFila}>
            <input
              style={styles.input}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre completo del mesero"
              required
            />
            <button type="submit" style={styles.btnGuardar} disabled={guardando}>
              {guardando ? 'Guardando...' : '✓ Crear'}
            </button>
          </div>
          {error && <p style={styles.errorMsg}>{error}</p>}
        </form>
      )}

      {/* Lista */}
      {cargando ? (
        <p style={styles.cargando}>Cargando meseros...</p>
      ) : meseros.length === 0 ? (
        <div style={styles.vacio}>
          <p style={styles.vacioIcono}>🛎</p>
          <p style={styles.vacioTexto}>No hay meseros registrados aún.</p>
          <p style={styles.vacioSub}>Crea el primero con el botón de arriba.</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {meseros.map((m) => (
            <MeseroCard
              key={m.id_usuario}
              mesero={m}
              onEliminar={eliminarMesero}
              onReactivar={reactivarMesero}
              verDesactivados={verDesactivados}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const MeseroCard = ({ mesero, onEliminar, onReactivar, verDesactivados }) => {
  const [stats, setStats] = useState({ hoy: 0, total: 0 });

  useEffect(() => {
    const cargar = async () => {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const [{ count: hoyCount }, { count: totalCount }] = await Promise.all([
        supabase
          .from('pedidos')
          .select('id_pedido', { count: 'exact', head: true })
          .eq('id_mesero', mesero.id_usuario)
          .eq('estado_actual', 'Entregado')
          .gte('fecha_creacion', hoy.toISOString()),
        supabase
          .from('pedidos')
          .select('id_pedido', { count: 'exact', head: true })
          .eq('id_mesero', mesero.id_usuario)
          .eq('estado_actual', 'Entregado'),
      ]);

      setStats({ hoy: hoyCount ?? 0, total: totalCount ?? 0 });
    };
    cargar();
  }, [mesero.id_usuario]);

  return (
    <div style={styles.card}>
      <div style={styles.cardAvatar}>
        {mesero.nombre?.charAt(0).toUpperCase()}
      </div>
      <div style={styles.cardInfo}>
        <p style={styles.cardNombre}>{mesero.nombre}</p>
        <p style={styles.cardSub}>Mesero</p>
      </div>
      <div style={styles.cardStats}>
        <div style={styles.stat}>
          <span style={styles.statNum}>{stats.hoy}</span>
          <span style={styles.statLabel}>hoy</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statNum}>{stats.total}</span>
          <span style={styles.statLabel}>total</span>
        </div>
      </div>
      {verDesactivados ? (
        <button style={styles.btnReactivar} onClick={() => onReactivar(mesero.id_usuario)} title="Reactivar">
          ♻️
        </button>
      ) : (
        <button style={styles.btnEliminar} onClick={() => onEliminar(mesero.id_usuario)} title="Eliminar">
          🗑
        </button>
      )}
    </div>
  );
};

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  titulo: { margin: 0, color: '#FFFFFF', fontSize: '20px', fontWeight: '700' },
  btnNuevo: { padding: '10px 20px', backgroundColor: '#B87333', color: '#000000', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' },
  btnToggleVista: { padding: '10px 16px', backgroundColor: 'transparent', color: '#999', border: '1px solid #333', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  btnToggleVistaActivo: { backgroundColor: 'rgba(184,115,51,0.15)', color: '#B87333', border: '1px solid #B87333' },
  exito: { backgroundColor: 'rgba(27,94,32,0.15)', border: '1px solid #1B5E20', color: '#4CAF50', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', fontSize: '14px' },
  form: { backgroundColor: '#1A1A1A', borderRadius: '12px', padding: '20px', marginBottom: '24px', border: '1px solid #333' },
  formTitulo: { margin: '0 0 14px', color: '#FFFFFF', fontSize: '15px', fontWeight: '600' },
  formFila: { display: 'flex', gap: '12px' },
  input: { flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#2A2A2A', color: '#FFFFFF', fontSize: '14px', outline: 'none' },
  btnGuardar: { padding: '10px 24px', backgroundColor: '#B87333', color: '#000000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', whiteSpace: 'nowrap' },
  errorMsg: { color: '#ff6b6b', fontSize: '13px', margin: '10px 0 0' },
  cargando: { color: '#666', textAlign: 'center' },
  vacio: { textAlign: 'center', marginTop: '60px' },
  vacioIcono: { fontSize: '48px', margin: '0 0 8px' },
  vacioTexto: { color: '#CCCCCC', fontSize: '16px', fontWeight: '600', margin: '0 0 4px' },
  vacioSub: { color: '#666', fontSize: '14px', margin: 0 },
  grid: { display: 'flex', flexDirection: 'column', gap: '10px' },
  card: { backgroundColor: '#1A1A1A', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', border: '1px solid #333', transition: 'all 0.2s ease' },
  cardAvatar: { width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'rgba(184,115,51,0.2)', color: '#B87333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '700', flexShrink: 0, border: '1px solid rgba(184,115,51,0.4)' },
  cardInfo: { flex: 1 },
  cardNombre: { margin: 0, color: '#FFFFFF', fontWeight: '700', fontSize: '15px' },
  cardSub: { margin: '2px 0 0', color: '#666', fontSize: '12px' },
  cardStats: { display: 'flex', gap: '12px' },
  stat: { display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#2A2A2A', borderRadius: '8px', padding: '6px 14px', border: '1px solid #333' },
  statNum: { color: '#B87333', fontWeight: '700', fontSize: '16px' },
  statLabel: { color: '#666', fontSize: '11px' },
  btnEliminar: { background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', padding: '4px', color: '#555', opacity: 0.6 },
  btnReactivar: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', padding: '4px' },
};

export default MeserosCRUD;
