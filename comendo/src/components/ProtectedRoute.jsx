// src/components/ProtectedRoute.jsx
// Componente que protege rutas privadas.
// Si el usuario no está autenticado, redirige al login.

import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../api/supabase';

const ProtectedRoute = ({ children }) => {
  const [sesion, setSesion] = useState(undefined); // undefined = cargando

  useEffect(() => {
    // Verifica si hay una sesión activa al montar el componente
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSesion(session);
    });

    // Escucha cambios de sesión (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSesion(session)
    );

    return () => subscription.unsubscribe();
  }, []);

  // Mientras verifica la sesión muestra una pantalla de carga
  if (sesion === undefined) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#fff', fontSize: '18px' }}>Verificando sesión...</p>
      </div>
    );
  }

  // Si no hay sesión, redirige al login
  if (!sesion) return <Navigate to="/login" replace />;

  // Si hay sesión, renderiza el contenido protegido
  return children;
};

export default ProtectedRoute;