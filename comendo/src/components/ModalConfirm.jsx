// src/components/ModalConfirm.jsx
// Modal de confirmación reutilizable que reemplaza window.confirm
// Se usa en eliminaciones y acciones críticas del panel admin

const ModalConfirm = ({ titulo, mensaje, onConfirmar, onCancelar, colorConfirmar = '#E53935', labelConfirmar = 'Confirmar' }) => {
  return (
    <>
      {/* Overlay */}
      <div style={styles.overlay} onClick={onCancelar} />

      {/* Modal */}
      <div style={styles.modal}>

        {/* Ícono y título */}
        <div style={styles.header}>
          <span style={styles.icono}>⚠️</span>
          <h3 style={styles.titulo}>{titulo}</h3>
        </div>

        {/* Mensaje */}
        <p style={styles.mensaje}>{mensaje}</p>

        {/* Botones */}
        <div style={styles.botones}>
          <button style={styles.btnCancelar} onClick={onCancelar}>
            Cancelar
          </button>
          <button
            style={{ ...styles.btnConfirmar, backgroundColor: colorConfirmar }}
            onClick={onConfirmar}
          >
            {labelConfirmar}
          </button>
        </div>

      </div>
    </>
  );
};

const styles = {
  overlay: {
    position: 'fixed', inset: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 200,
  },
  modal: {
    position: 'fixed',
    top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#16213e',
    borderRadius: '16px',
    padding: '32px',
    width: '90%', maxWidth: '400px',
    zIndex: 201,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    border: '1px solid #2D6A4F',
  },
  header: {
    display: 'flex', alignItems: 'center',
    gap: '12px', marginBottom: '16px',
  },
  icono: { fontSize: '28px' },
  titulo: { margin: 0, color: '#fff', fontSize: '18px', fontWeight: '700' },
  mensaje: { color: '#ccc', fontSize: '15px', margin: '0 0 24px', lineHeight: '1.5' },
  botones: { display: 'flex', gap: '12px', justifyContent: 'flex-end' },
  btnCancelar: {
    padding: '10px 20px',
    backgroundColor: 'transparent',
    border: '1px solid #555',
    color: '#ccc', borderRadius: '8px',
    cursor: 'pointer', fontWeight: '600',
    fontSize: '14px',
  },
  btnConfirmar: {
    padding: '10px 20px',
    border: 'none', color: '#fff',
    borderRadius: '8px', cursor: 'pointer',
    fontWeight: '700', fontSize: '14px',
    minHeight: '44px',
  },
};

export default ModalConfirm;