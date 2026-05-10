import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabase';
import { UtensilsCrossed } from 'lucide-react';

const LOGIN_CSS = `
  .btn-login {
    transition: all 0.3s ease;
  }
  .btn-login:hover {
    background-color: #D4922A !important;
    transform: translateY(-2px);
    box-shadow: 0 6px 25px rgba(184, 115, 51, 0.4);
  }
  .btn-login:active {
    transform: translateY(0);
  }
  .login-input {
    transition: all 0.3s ease;
  }
  .login-input:focus {
    border-color: #B87333 !important;
    box-shadow: 0 0 0 2px rgba(184, 115, 51, 0.2) !important;
    outline: none;
  }
  .login-container {
    animation: fadeInUp 0.5s ease-out;
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

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

      const { data, error: errorAuth } = await supabase.auth.signInWithPassword({ email, password });
      if (errorAuth) throw errorAuth;

      const { data: usuario, error: errorRol } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('email', data.user.email)
        .single();

      if (errorRol || !usuario) {
        await supabase.auth.signOut();
        setError('No tienes un rol asignado en el sistema.');
        return;
      }

      if (usuario.rol === 'Administrador') {
        navigate('/admin');
      } else if (usuario.rol === 'Operario_Cocina') {
        navigate('/cocina');
      } else if (usuario.rol === 'Mesero') {
        navigate('/mesero');
      } else {
        await supabase.auth.signOut();
        setError('Rol no reconocido. Contacta al administrador.');
      }
    } catch {
      setError('Credenciales incorrectas. Verifica tu email y contraseña.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      <style>{LOGIN_CSS}</style>

      <div style={styles.pagina}>
        <div className="login-container" style={styles.contenedor}>

          <div style={styles.header}>
            <div style={styles.iconoWrapper}>
              <UtensilsCrossed size={40} color="#B87333" />
            </div>
            <h1 style={styles.titulo}>Mr. Arroz Paisa</h1>
            <p style={styles.subtitulo}>Panel Administrativo</p>
          </div>

          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.campo}>
              <label style={styles.label}>Correo electrónico</label>
              <input
                className="login-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                style={styles.input}
                required
              />
            </div>

            <div style={styles.campo}>
              <label style={styles.label}>Contraseña</label>
              <input
                className="login-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={styles.input}
                required
              />
            </div>

            {error && (
              <div style={styles.errorBox}>
                {error}
              </div>
            )}

            <button
              className="btn-login"
              type="submit"
              style={{
                ...styles.btnLogin,
                opacity: cargando ? 0.7 : 1,
                cursor: cargando ? 'not-allowed' : 'pointer',
              }}
              disabled={cargando}
            >
              {cargando ? 'Verificando...' : 'Ingresar'}
            </button>
          </form>

        </div>
      </div>
    </>
  );
};

const styles = {
  pagina: {
    minHeight: '100vh',
    backgroundColor: '#0D0D0D',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'sans-serif',
    padding: '24px',
  },
  contenedor: {
    width: '100%',
    maxWidth: '380px',
    backgroundColor: '#1A1A1A',
    borderRadius: '20px',
    border: '1px solid #333',
    padding: '32px',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '32px',
  },
  iconoWrapper: {
    marginBottom: '12px',
  },
  titulo: {
    margin: '0 0 6px',
    fontFamily: 'Georgia, serif',
    fontSize: '24px',
    fontWeight: 700,
    color: '#B87333',
    textAlign: 'center',
  },
  subtitulo: {
    margin: 0,
    fontSize: '14px',
    color: '#999999',
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  campo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    color: '#999999',
    fontSize: '13px',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  input: {
    backgroundColor: '#2A2A2A',
    border: '1px solid #333',
    borderRadius: '10px',
    padding: '14px 16px',
    color: '#FFFFFF',
    fontSize: '15px',
    width: '100%',
    boxSizing: 'border-box',
  },
  errorBox: {
    backgroundColor: 'rgba(255,60,60,0.1)',
    border: '1px solid rgba(255,60,60,0.3)',
    borderRadius: '8px',
    color: '#ff6b6b',
    padding: '10px',
    fontSize: '13px',
    textAlign: 'center',
  },
  btnLogin: {
    backgroundColor: '#B87333',
    color: '#000000',
    fontWeight: 700,
    fontSize: '16px',
    padding: '14px',
    width: '100%',
    borderRadius: '12px',
    border: 'none',
    marginTop: '4px',
    minHeight: '44px',
  },
};

export default LoginPage;
