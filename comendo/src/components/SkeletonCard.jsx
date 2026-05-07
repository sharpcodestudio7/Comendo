const SkeletonCard = () => {
  return (
    <div style={styles.card}>
      <div style={styles.imagen} />
      <div style={styles.info}>
        <div style={{ ...styles.linea, width: '75%', height: '16px', marginBottom: '8px' }} />
        <div style={{ ...styles.linea, width: '100%', height: '11px', marginBottom: '4px' }} />
        <div style={{ ...styles.linea, width: '60%', height: '11px', marginBottom: '14px' }} />
        <div style={{ ...styles.linea, width: '45%', height: '14px', marginBottom: '14px' }} />
        <div style={{ ...styles.linea, width: '72px', height: '30px', borderRadius: '20px' }} />
      </div>
    </div>
  );
};

const globalStyles = `
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  input::placeholder { color: #555 !important; }
  textarea::placeholder { color: #555 !important; }
`;

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = globalStyles;
  document.head.appendChild(style);
}

const styles = {
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'row',
    gap: '12px',
    padding: '12px',
    overflow: 'hidden',
  },
  imagen: {
    width: '120px',
    height: '120px',
    borderRadius: '12px',
    flexShrink: 0,
    background: 'linear-gradient(90deg, #222 25%, #2e2e2e 50%, #222 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
  },
  info: {
    flex: 1,
    paddingTop: '4px',
  },
  linea: {
    height: '14px',
    borderRadius: '6px',
    background: 'linear-gradient(90deg, #222 25%, #2e2e2e 50%, #222 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
  },
};

export default SkeletonCard;
