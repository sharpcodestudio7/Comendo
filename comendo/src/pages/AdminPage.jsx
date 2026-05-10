import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabase';
import { UtensilsCrossed, LayoutGrid, Package, BookOpen, Map, QrCode, BarChart2, Users, LogOut, Menu, X } from 'lucide-react';
import Dashboard from '../components/admin/Dashboard';
import ProductosCRUD from '../components/admin/ProductosCRUD';
import InsumosCRUD from '../components/admin/InsumosCRUD';
import RecetasCRUD from '../components/admin/RecetasCRUD';
import MesasQR from '../components/admin/MesasQR';
import MonitorMesas from '../components/admin/MonitorMesas';
import MovimientosInventario from '../components/admin/MovimientosInventario';
import MeserosCRUD from '../components/admin/MeserosCRUD';

const ADMIN_CSS = `
  body { background-color: #0D0D0D !important; }
  .admin-nav-btn {
    transition: all 0.2s ease;
  }
  .admin-nav-btn:hover {
    background-color: rgba(184, 115, 51, 0.08) !important;
    color: #FFFFFF !important;
  }
  .admin-nav-btn-activo {
    background-color: rgba(184, 115, 51, 0.15) !important;
    color: #B87333 !important;
    border-left: 3px solid #B87333 !important;
  }
  .admin-logout-btn {
    transition: all 0.2s ease;
  }
  .admin-logout-btn:hover {
    background-color: rgba(255, 68, 68, 0.1) !important;
  }
  .admin-card {
    transition: all 0.2s ease;
  }
  .admin-card:hover {
    border-color: #B87333 !important;
    transform: translateY(-1px);
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
  }
  .admin-btn {
    transition: all 0.2s ease;
  }
  .admin-btn:hover {
    transform: translateY(-1px);
    filter: brightness(1.15);
  }
  .admin-btn:active {
    transform: translateY(0);
  }
  .admin-fade-in {
    animation: adminFadeIn 0.3s ease-out;
  }
  @keyframes adminFadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @media (max-width: 768px) {
    .admin-sidebar {
      position: fixed !important;
      left: -260px !important;
      top: 0 !important;
      height: 100vh !important;
      z-index: 200 !important;
      transition: left 0.3s ease !important;
    }
    .admin-sidebar-open {
      left: 0 !important;
    }
    .admin-sidebar-overlay {
      display: block !important;
    }
    .admin-hamburger {
      display: flex !important;
    }
  }
  @media (min-width: 769px) {
    .admin-hamburger {
      display: none !important;
    }
    .admin-sidebar-overlay {
      display: none !important;
    }
    .admin-mobile-header {
      display: none !important;
    }
  }
`;

const NAV_ITEMS = [
  { key: 'monitor',     label: 'Monitor Mesas',  Icon: Map },
  { key: 'productos',   label: 'Productos',       Icon: LayoutGrid },
  { key: 'dashboard',   label: 'Dashboard',       Icon: BarChart2 },
  { key: 'inventario',  label: 'Inventario',      Icon: Package },
  { key: 'recetas',     label: 'Recetas',         Icon: BookOpen },
  { key: 'movimientos', label: 'Movimientos',     Icon: BarChart2 },
  { key: 'qr',          label: 'QR Mesas',        Icon: QrCode },
  { key: 'meseros',     label: 'Meseros',         Icon: Users },
];

const AdminPage = () => {
  const navigate = useNavigate();
  const [seccionActiva, setSeccionActiva] = useState('monitor');
  const [menuAbierto, setMenuAbierto] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navegarA = (key) => {
    setSeccionActiva(key);
    setMenuAbierto(false);
  };

  return (
    <>
      <style>{ADMIN_CSS}</style>

      <div style={styles.pagina}>

        {/* Overlay móvil detrás del sidebar */}
        <div
          className="admin-sidebar-overlay"
          style={{ ...styles.sidebarOverlay, display: menuAbierto ? 'block' : 'none' }}
          onClick={() => setMenuAbierto(false)}
        />

        {/* Sidebar */}
        <aside
          className={`admin-sidebar${menuAbierto ? ' admin-sidebar-open' : ''}`}
          style={styles.sidebar}
        >
          {/* Logo */}
          <div style={styles.logoArea}>
            <div style={styles.logoIcono}>
              <UtensilsCrossed size={22} color="#B87333" />
            </div>
            <div>
              <p style={styles.logoNombre}>Comendo</p>
              <p style={styles.logoSub}>Panel Admin</p>
            </div>
          </div>

          <div style={styles.sidebarDivider} />

          {/* Nav items */}
          <nav style={styles.nav}>
            {NAV_ITEMS.map(({ key, label, Icon }) => {
              const activo = seccionActiva === key;
              return (
                <button
                  key={key}
                  className={`admin-nav-btn${activo ? ' admin-nav-btn-activo' : ''}`}
                  style={{
                    ...styles.navBtn,
                    ...(activo ? styles.navBtnActivo : {}),
                  }}
                  onClick={() => navegarA(key)}
                >
                  <Icon size={16} color={activo ? '#B87333' : '#666'} />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>

          {/* Logout */}
          <div style={styles.sidebarFooter}>
            <div style={styles.sidebarDivider} />
            <button
              className="admin-logout-btn"
              style={styles.btnLogout}
              onClick={handleLogout}
            >
              <LogOut size={14} color="#ff4444" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </aside>

        {/* Columna derecha */}
        <div style={styles.columnaContenido}>
          {/* Header móvil con hamburguesa */}
          <div className="admin-mobile-header" style={styles.mobileHeader}>
            <div style={styles.mobileHeaderLogo}>
              <UtensilsCrossed size={20} color="#B87333" />
              <span style={styles.mobileHeaderNombre}>Comendo Admin</span>
            </div>
            <button
              className="admin-hamburger"
              style={styles.hamburger}
              onClick={() => setMenuAbierto(!menuAbierto)}
            >
              {menuAbierto ? <X size={22} color="#FFFFFF" /> : <Menu size={22} color="#FFFFFF" />}
            </button>
          </div>

          {/* Contenido principal */}
          <main className="admin-fade-in" style={styles.contenido}>
            {seccionActiva === 'monitor'     && <MonitorMesas />}
            {seccionActiva === 'productos'   && <ProductosCRUD />}
            {seccionActiva === 'dashboard'   && <Dashboard />}
            {seccionActiva === 'inventario'  && <InsumosCRUD />}
            {seccionActiva === 'movimientos' && <MovimientosInventario />}
            {seccionActiva === 'recetas'     && <RecetasCRUD />}
            {seccionActiva === 'qr'          && <MesasQR />}
            {seccionActiva === 'meseros'     && <MeserosCRUD />}
          </main>
        </div>

      </div>
    </>
  );
};

const styles = {
  pagina: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#0D0D0D',
    fontFamily: 'sans-serif',
  },

  // Sidebar
  sidebar: {
    width: '240px',
    backgroundColor: '#0D0D0D',
    borderRight: '1px solid #222',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    transition: 'left 0.3s ease',
  },
  sidebarOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 199,
  },
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '20px 16px 16px',
  },
  logoIcono: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: '#1A1A1A',
    border: '1px solid #333',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logoNombre: {
    margin: 0,
    fontFamily: 'Georgia, serif',
    fontSize: '16px',
    fontWeight: 700,
    color: '#B87333',
    lineHeight: 1.2,
  },
  logoSub: {
    margin: 0,
    fontSize: '11px',
    color: '#666',
    letterSpacing: '0.5px',
  },
  sidebarDivider: {
    height: '1px',
    backgroundColor: '#1E1E1E',
    margin: '0 16px',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
    padding: '12px 8px',
    overflowY: 'auto',
  },
  navBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '11px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    borderLeft: '3px solid transparent',
    color: '#999999',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: '500',
    fontFamily: 'sans-serif',
    width: '100%',
  },
  navBtnActivo: {
    backgroundColor: 'rgba(184,115,51,0.15)',
    color: '#B87333',
    borderLeft: '3px solid #B87333',
    borderRadius: '0 8px 8px 0',
  },
  sidebarFooter: {
    padding: '0 0 16px',
  },
  btnLogout: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '11px 20px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#ff4444',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    textAlign: 'left',
    fontFamily: 'sans-serif',
    marginTop: '8px',
  },

  // Columna derecha
  columnaContenido: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },

  // Header móvil
  mobileHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    backgroundColor: '#1A1A1A',
    borderBottom: '1px solid #222',
    flexShrink: 0,
  },
  mobileHeaderLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  mobileHeaderNombre: {
    fontFamily: 'Georgia, serif',
    fontSize: '16px',
    color: '#B87333',
    fontWeight: 700,
  },
  hamburger: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
  },

  // Contenido
  contenido: {
    flex: 1,
    padding: '28px 32px',
    overflowY: 'auto',
    backgroundColor: '#0D0D0D',
  },
};

export default AdminPage;
