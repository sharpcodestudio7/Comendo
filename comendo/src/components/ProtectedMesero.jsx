// src/components/ProtectedMesero.jsx
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../api/supabase';

const ProtectedMesero = ({ children }) => {
  const [sesion, setSesion] = useState(undefined);
  const [rol, setRol]       = useState(null);

  useEffect(() => {
    const verificar = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setSesion(null); return; }

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('email', session.user.email)
        .single();

      setSesion(session);
      setRol(usuario?.rol || null);
    };

    verificar();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) { setSesion(null); setRol(null); }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (sesion === undefined) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: '16px', color: '#555' }}>Verificando sesión...</p>
      </div>
    );
  }

  if (!sesion) return <Navigate to="/login" replace />;
  if (rol !== 'Mesero') return <Navigate to="/login" replace />;

  return children;
};

export default ProtectedMesero;
