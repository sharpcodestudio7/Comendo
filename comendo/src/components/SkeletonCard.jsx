// src/components/SkeletonCard.jsx
// Componente de carga esqueleto para las tarjetas del menú
// Simula la forma de ProductCard mientras cargan los datos

const SkeletonCard = () => {
  return (
    <div style={styles.card}>
      {/* Imagen placeholder */}
      <div style={styles.imagen} />

      {/* Contenido placeholder */}
      <div style={styles.contenido}>
        {/* Nombre */}
        <div style={{ ...styles.linea, width: '80%', marginBottom: '8px' }} />
        {/* Descripción línea 1 */}
        <div style={{ ...styles.linea, width: '100%', height: '10px', marginBottom: '4px' }} />
        {/* Descripción línea 2 */}
        <div style={{ ...styles.linea, width: '60%', height: '10px', marginBottom: '12px' }} />
        {/* Precio */}
        <div style={{ ...styles.linea, width: '40%', height: '16px', marginBottom: '12px' }} />
        {/* Botón */}
        <div style={{ ...styles.linea, width: '100%', height: '36px', borderRadius: '8px' }} />
      </div>
    </div>
  );
};

const shimmer = `
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`;

// Inyecta la animación en el documento
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = shimmer;
  document.head.appendChild(style);
}

const styles = {
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  imagen: {
    width: '100%',
    height: '140px',
    background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
  },
  contenido: {
    padding: '12px',
  },
  linea: {
    height: '14px',
    borderRadius: '4px',
    background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
  },
};

export default SkeletonCard;