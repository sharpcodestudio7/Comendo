// src/pages/AdminPage.jsx
import { useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabase';

const AdminPage = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div style={{ color: '#fff', backgroundColor: '#1a1a2e', minHeight: '100vh', padding: '40px', fontFamily: 'Arial' }}>
      <h1>🛠 Panel Admin — en construcción</h1>
      <button
        onClick={handleLogout}
        style={{ marginTop: '20px', padding: '12px 24px', backgroundColor: '#E53935', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}
      >
        Cerrar Sesión
      </button>
    </div>
  );
};

export default AdminPage;