// src/components/ProtectedKDS.jsx
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../api/supabase';

const ProtectedKDS = ({ children }) => {
  const [sesion, setSesion] = useState(undefined);
  const [rol, setRol] = useState(null);

  useEffect(() => {
    const verificar = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setSesion(null);
        return;
      }

      // Consulta el rol del usuario
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('email', session.user.email)
        .single();

      setSesion(session);
      setRol(usuario?.rol || null);
    };

    verificar();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          setSesion(null);
          setRol(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (sesion === undefined) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#fff', fontSize: '18px' }}>Verificando sesión...</p>
      </div>
    );
  }

  if (!sesion) return <Navigate to="/login" replace />;
  if (rol !== 'Operario_Cocina') return <Navigate to="/login" replace />;

  return children;
};

export default ProtectedKDS;