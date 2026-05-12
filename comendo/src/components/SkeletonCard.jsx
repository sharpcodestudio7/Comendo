const SKELETON_CSS = `
  @keyframes skeletonShimmer {
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
  }
  .skeleton-bone {
    background: linear-gradient(90deg, #2A2A2A 25%, #3A3A3A 50%, #2A2A2A 75%);
    background-size: 200% 100%;
    animation: skeletonShimmer 1.5s ease-in-out infinite;
  }
  input::placeholder  { color: #555 !important; }
  textarea::placeholder { color: #555 !important; }
`;

if (typeof document !== 'undefined') {
  const el = document.createElement('style');
  el.textContent = SKELETON_CSS;
  document.head.appendChild(el);
}

const SkeletonCard = () => (
  <div style={styles.card}>
    <div className="skeleton-bone" style={styles.imagen} />
    <div style={styles.info}>
      <div className="skeleton-bone" style={{ height: '16px', width: '70%',  borderRadius: '4px' }} />
      <div className="skeleton-bone" style={{ height: '12px', width: '90%',  borderRadius: '4px' }} />
      <div className="skeleton-bone" style={{ height: '12px', width: '60%',  borderRadius: '4px' }} />
      <div className="skeleton-bone" style={{ height: '16px', width: '40%',  borderRadius: '4px', marginTop: '8px' }} />
      <div className="skeleton-bone" style={{ height: '36px', width: '100px', borderRadius: '20px', marginTop: '8px' }} />
    </div>
  </div>
);

const styles = {
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: '16px',
    border: '1px solid #333',
    display: 'flex',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  imagen: {
    width: '140px',
    height: '140px',
    flexShrink: 0,
  },
  info: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px 16px',
  },
};

export default SkeletonCard;
