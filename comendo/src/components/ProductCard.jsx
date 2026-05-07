import { useState } from 'react';
import useCartStore from '../store/useCartStore';
import ProductDetailModal from './ProductDetailModal';

const ProductCard = ({ producto, soloLectura = false }) => {
  const { items, agregarItem, quitarItem } = useCartStore();
  const [modalAbierto, setModalAbierto] = useState(false);
  const itemEnCarrito = items.find((i) => i.producto.id_producto === producto.id_producto);
  const cantidad = itemEnCarrito ? itemEnCarrito.cantidad : 0;

  const precioFormateado = '$' + new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(producto.precio);

  return (
    <>
      <div style={styles.card}>
        {producto.imagen_url ? (
          <img src={producto.imagen_url} alt={producto.nombre} style={styles.imagen} />
        ) : (
          <div style={styles.imagenPlaceholder}>
            <span style={{ fontSize: '36px', opacity: 0.2 }}>🍽</span>
          </div>
        )}

        <div style={styles.info}>
          <h3 style={styles.nombre}>{producto.nombre}</h3>
          {producto.descripcion && (
            <p style={styles.descripcion}>{producto.descripcion}</p>
          )}
          <span style={styles.precio}>
            {precioFormateado} <span style={styles.precioCOP}>COP</span>
          </span>

          <div style={styles.controles}>
            {soloLectura ? (
              <button style={styles.btnSoloLectura} disabled>Solo vista</button>
            ) : cantidad === 0 ? (
              <button
                className="btn-agregar"
                style={styles.btnAgregar}
                onClick={() => setModalAbierto(true)}
              >
                Agregar
              </button>
            ) : (
              <div style={styles.contador}>
                <button style={styles.btnContador} onClick={() => quitarItem(producto.id_producto)}>−</button>
                <span style={styles.cantidad}>{cantidad}</span>
                <button style={{ ...styles.btnContador, ...styles.btnContadorMas }} onClick={() => agregarItem(producto)}>+</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {modalAbierto && (
        <ProductDetailModal
          producto={producto}
          onCerrar={() => setModalAbierto(false)}
        />
      )}
    </>
  );
};

const styles = {
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: '16px',
    border: '1px solid #333333',
    display: 'flex',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  imagen: {
    width: '140px',
    height: '140px',
    objectFit: 'cover',
    borderRadius: '12px 0 0 12px',
    flexShrink: 0,
    display: 'block',
  },
  imagenPlaceholder: {
    width: '140px',
    height: '140px',
    borderRadius: '12px 0 0 12px',
    backgroundColor: '#2A2A2A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: 0,
    padding: '12px 16px',
  },
  nombre: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: '1.3',
  },
  descripcion: {
    margin: 0,
    fontSize: '13px',
    color: '#999999',
    lineHeight: '1.4',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  precio: {
    fontWeight: '700',
    color: '#C8A84E',
    fontSize: '15px',
    marginTop: '4px',
  },
  precioCOP: {
    fontSize: '12px',
    fontWeight: '500',
    opacity: 0.8,
  },
  controles: {
    marginTop: 'auto',
    paddingTop: '8px',
  },
  btnAgregar: {
    padding: '7px 18px',
    backgroundColor: '#B87333',
    color: '#000000',
    border: 'none',
    borderRadius: '20px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '13px',
    minHeight: '34px',
    transition: 'background-color 0.18s',
  },
  btnSoloLectura: {
    padding: '7px 14px',
    backgroundColor: '#2A2A2A',
    color: '#555',
    border: '1px solid #333',
    borderRadius: '20px',
    cursor: 'not-allowed',
    fontSize: '12px',
  },
  contador: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  btnContador: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    border: '1.5px solid #C8A84E',
    backgroundColor: 'transparent',
    color: '#C8A84E',
    fontSize: '18px',
    cursor: 'pointer',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  btnContadorMas: {
    backgroundColor: '#C8A84E',
    color: '#0D0D0D',
    border: 'none',
  },
  cantidad: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#FFFFFF',
    minWidth: '20px',
    textAlign: 'center',
  },
};

export default ProductCard;
