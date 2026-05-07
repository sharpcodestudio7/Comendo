import { useParams, useNavigate } from 'react-router-dom';
import { UtensilsCrossed } from 'lucide-react';

const LANDING_CSS = `
  @keyframes fadeInUpLanding {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeInLogo {
    from { opacity: 0; transform: scale(0.8); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes lineExpand {
    from { width: 0; }
    to { width: 60px; }
  }
  .landing-logo {
    animation: fadeInLogo 0.8s ease-out;
  }
  .landing-title {
    animation: fadeInUpLanding 0.8s ease-out 0.2s both;
  }
  .landing-subtitle {
    animation: fadeInUpLanding 0.8s ease-out 0.4s both;
  }
  .landing-line {
    animation: lineExpand 0.6s ease-out 0.6s both;
  }
  .landing-phrase {
    animation: fadeInUpLanding 0.8s ease-out 0.6s both;
  }
  .landing-btn-1 {
    animation: fadeInUpLanding 0.8s ease-out 0.8s both;
  }
  .landing-btn-2 {
    animation: fadeInUpLanding 0.8s ease-out 1s both;
  }
  .btn-landing-menu {
    transition: all 0.3s ease;
  }
  .btn-landing-menu:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(184, 115, 51, 0.4);
    background-color: #D4922A !important;
  }
  .btn-landing-menu:active {
    transform: translateY(0);
  }
  .btn-landing-conocenos {
    transition: all 0.3s ease;
  }
  .btn-landing-conocenos:hover {
    background-color: rgba(184, 115, 51, 0.1) !important;
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(184, 115, 51, 0.2);
  }
  .btn-landing-conocenos:active {
    transform: translateY(0);
  }
`;

const LandingPage = () => {
  const { mesaId } = useParams();
  const navigate = useNavigate();

  const irAlMenu = () => navigate(`/mesa/${mesaId}/menu`);

  const irAConocenos = () => {
    document.getElementById('conocenos')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <style>{LANDING_CSS}</style>

      {/* ── Hero con video de fondo ── */}
      <section style={styles.hero}>
        <video
          autoPlay
          loop
          muted
          playsInline
          style={styles.video}
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>

        <div style={styles.overlay} />

        <div style={styles.heroContenido}>
          <div className="landing-logo" style={styles.logoWrapper}>
            <UtensilsCrossed size={48} color="#B87333" />
          </div>

          <h1 className="landing-title" style={styles.nombre}>Mr. Arroz Paisa</h1>

          <p className="landing-subtitle" style={styles.subtitulo}>— Comendo —</p>

          <div className="landing-line" style={styles.lineaDecorativa} />

          <p className="landing-phrase" style={styles.frase}>La auténtica cocina paisa</p>

          <div style={styles.espaciador} />

          <button
            className="btn-landing-menu landing-btn-1"
            style={styles.btnMenu}
            onClick={irAlMenu}
          >
            Nuestro Menú
          </button>

          <div style={{ height: '16px' }} />

          <button
            className="btn-landing-conocenos landing-btn-2"
            style={styles.btnConocenos}
            onClick={irAConocenos}
          >
            Conócenos
          </button>
        </div>
      </section>

      {/* ── Sección Conócenos ── */}
      <section id="conocenos" style={styles.seccionConocenos}>
        <h2 style={styles.tituloConocenos}>Nuestra Historia</h2>
        <div style={styles.lineaConocenos} />

        <p style={styles.textoConocenos}>
          En Mr. Arroz Paisa nos dedicamos a preparar los mejores platos de la cocina
          tradicional paisa, con ingredientes frescos y recetas de familia.
        </p>

        <div style={styles.iconosGrid}>
          {[
            { icono: '🌿', label: 'Ingredientes Frescos' },
            { icono: '📖', label: 'Recetas Tradicionales' },
            { icono: '⭐', label: 'Sabor Auténtico' },
          ].map(({ icono, label }) => (
            <div key={label} style={styles.iconoItem}>
              <span style={styles.icono}>{icono}</span>
              <span style={styles.iconoLabel}>{label}</span>
            </div>
          ))}
        </div>

        <button
          className="btn-landing-menu"
          style={{ ...styles.btnMenu, marginTop: '40px' }}
          onClick={irAlMenu}
        >
          Ver el Menú
        </button>
      </section>
    </>
  );
};

const styles = {
  hero: {
    position: 'relative',
    width: '100%',
    height: '100vh',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.95) 100%)',
    zIndex: 1,
  },
  heroContenido: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '0 24px',
    width: '100%',
    maxWidth: '500px',
  },
  logoWrapper: {
    marginBottom: '16px',
  },
  nombre: {
    margin: '0 0 8px',
    fontFamily: 'Georgia, serif',
    fontSize: '32px',
    fontWeight: 700,
    color: '#B87333',
    letterSpacing: '1px',
  },
  subtitulo: {
    margin: 0,
    fontSize: '16px',
    fontStyle: 'italic',
    color: '#E8D5A0',
    letterSpacing: '3px',
  },
  lineaDecorativa: {
    height: '1px',
    backgroundColor: '#B87333',
    margin: '20px auto',
    display: 'block',
  },
  frase: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 300,
    color: '#FFFFFF',
    opacity: 0.9,
    fontFamily: 'sans-serif',
  },
  espaciador: {
    height: '40px',
  },
  btnMenu: {
    backgroundColor: '#B87333',
    color: '#000000',
    fontWeight: 700,
    fontSize: '16px',
    width: 'min(260px, 85vw)',
    padding: '16px',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'sans-serif',
  },
  btnConocenos: {
    backgroundColor: 'transparent',
    border: '1.5px solid #B87333',
    color: '#B87333',
    fontWeight: 600,
    fontSize: '15px',
    width: 'min(260px, 85vw)',
    padding: '14px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontFamily: 'sans-serif',
  },

  /* ── Sección Conócenos ── */
  seccionConocenos: {
    backgroundColor: '#0D0D0D',
    padding: '60px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    fontFamily: 'sans-serif',
  },
  tituloConocenos: {
    margin: '0 0 12px',
    fontSize: '22px',
    fontWeight: 700,
    color: '#B87333',
  },
  lineaConocenos: {
    width: '60px',
    height: '1px',
    backgroundColor: '#B87333',
    marginBottom: '24px',
  },
  textoConocenos: {
    margin: '0 0 40px',
    fontSize: '15px',
    color: '#999999',
    lineHeight: 1.8,
    maxWidth: '400px',
  },
  iconosGrid: {
    display: 'flex',
    gap: '32px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  iconoItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  icono: {
    fontSize: '28px',
  },
  iconoLabel: {
    fontSize: '13px',
    color: '#CCCCCC',
    maxWidth: '80px',
    textAlign: 'center',
    lineHeight: 1.4,
  },
};

export default LandingPage;
