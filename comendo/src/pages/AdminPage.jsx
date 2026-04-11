// src/pages/AdminPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import InsumosCRUD from '../components/admin/InsumosCRUD';
import { supabase } from '../api/supabase';
import Dashboard from '../components/admin/Dashboard';
import RecetasCRUD from '../components/admin/RecetasCRUD';
import ProductosCRUD from '../components/admin/ProductosCRUD';

const AdminPage = () => {
  const navigate = useNavigate();
  const [seccionActiva, setSeccionActiva] = useState('productos');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div style={styles.pagina}>

      {/* Sidebar */}
      <div style={styles.sidebar}>
        <h2 style={styles.logo}>🍽 Comendo</h2>
        <p style={styles.logoSub}>Panel Admin</p>

        <nav style={styles.nav}>
          <button
            style={{
              ...styles.navBtn,
              ...(seccionActiva === 'productos' ? styles.navBtnActivo : {}),
            }}
            onClick={() => setSeccionActiva('productos')}
          >
            🍛 Productos
          </button>
          <button
            style={{
              ...styles.navBtn,
              ...(seccionActiva === 'dashboard' ? styles.navBtnActivo : {}),
            }}
            onClick={() => setSeccionActiva('dashboard')}
          >
            📊 Dashboard
          </button>
          <button 
              style={{...styles.navBtn,
              ...(seccionActiva === 'inventario' ? styles.navBtnActivo : {}),
          }}
          onClick={() => setSeccionActiva('inventario')}>
      📦 Inventario
        </button>
        <button
          style={{
          ...styles.navBtn,
          ...(seccionActiva === 'recetas' ? styles.navBtnActivo : {}),
        }}
          onClick={() => setSeccionActiva('recetas')}
        >
        📋 Recetas
</button>
        </nav>
        <button style={styles.btnLogout} onClick={handleLogout}>
          🚪 Cerrar Sesión
        </button>
      </div>

      {/* ✅ Contenedor del contenido principal */}
      <div style={styles.contenido}>
        {seccionActiva === 'productos' && <ProductosCRUD />}
        {seccionActiva === 'dashboard' && <Dashboard />}
        {seccionActiva === 'inventario' && <InsumosCRUD />}
        {seccionActiva === 'recetas' && <RecetasCRUD />}
      </div>

    </div>
  );
};

const styles = {
  pagina: { display: 'flex', minHeight: '100vh', backgroundColor: '#1a1a2e', fontFamily: 'Arial, sans-serif' },
  sidebar: { width: '220px', backgroundColor: '#16213e', padding: '24px 16px', display: 'flex', flexDirection: 'column', borderRight: '1px solid #2D6A4F' },
  logo: { margin: '0 0 4px', color: '#fff', fontSize: '20px' },
  logoSub: { margin: '0 0 32px', color: '#888', fontSize: '12px' },
  nav: { display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 },
  navBtn: { padding: '12px 16px', backgroundColor: 'transparent', border: 'none', color: '#ccc', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontSize: '15px', fontWeight: '600' },
  navBtnActivo: { backgroundColor: '#2D6A4F', color: '#fff' },
  btnLogout: { padding: '12px 16px', backgroundColor: 'transparent', border: '1px solid #E53935', color: '#E53935', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  contenido: { flex: 1, padding: '32px', overflowY: 'auto' },
};

export default AdminPage;