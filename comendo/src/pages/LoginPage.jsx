// src/pages/LoginPage.jsx
// Página de login para el panel administrativo.
// Usa Supabase Auth para autenticar al administrador.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabase';

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setCargando(true);
      setError(null);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Login exitoso — redirige al panel admin
      navigate('/admin');

    } catch (err) {
      setError('Credenciales incorrectas. Verifica tu email y contraseña.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={styles.pagina}>
      <div style={styles.card}>

        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.titulo}>🍽 Comendo</h1>
          <p style={styles.subtitulo}>Panel Administrativo</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.campo}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@comendo.com"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.campo}>
            <label style={styles.label}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={styles.input}
              required
            />
          </div>

          {/* Mensaje de error */}
          {error && (
            <p style={styles.error}>{error}</p>
          )}

          <button
            type="submit"
            style={{
              ...styles.btnLogin,
              opacity: cargando ? 0.7 : 1,
              cursor: cargando ? 'not-allowed' : 'pointer',
            }}
            disabled={cargando}
          >
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

      </div>
    </div>
  );
};

const styles = {
  pagina: {
    minHeight: '100vh',
    backgroundColor: '#1a1a2e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Arial, sans-serif',
  },
  card: {
    backgroundColor: '#16213e',
    borderRadius: '16px',
    padding: '40px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  },
  header: { textAlign: 'center', marginBottom: '32px' },
  titulo: { margin: '0 0 8px', color: '#fff', fontSize: '28px' },
  subtitulo: { margin: 0, color: '#888', fontSize: '14px' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  campo: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { color: '#ccc', fontSize: '14px', fontWeight: '600' },
  input: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #2D6A4F',
    backgroundColor: '#0f3460',
    color: '#fff',
    fontSize: '15px',
    outline: 'none',
  },
  error: {
    color: '#E53935',
    fontSize: '13px',
    textAlign: 'center',
    margin: 0,
  },
  btnLogin: {
    padding: '14px',
    backgroundColor: '#2D6A4F',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '700',
    minHeight: '44px',
  },
};

export default LoginPage;