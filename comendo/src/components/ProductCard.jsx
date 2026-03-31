// src/components/ProductCard.jsx
// Tarjeta visual de cada producto del menú.
// Recibe el producto como prop y despacha acciones al store del carrito.

import useCartStore from '../store/useCartStore';

const ProductCard = ({ producto }) => {
  const { items, agregarItem, quitarItem } = useCartStore();

  // Busca si este producto ya está en el carrito
  const itemEnCarrito = items.find((i) => i.producto.id_producto === producto.id_producto);
  const cantidad = itemEnCarrito ? itemEnCarrito.cantidad : 0;

  // Formatea el precio en pesos colombianos
  const precioFormateado = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(producto.precio);

  return (
    <div style={styles.card}>
      {/* Imagen del producto */}
      {producto.imagen_url && (
        <img
          src={producto.imagen_url}
          alt={producto.nombre}
          style={styles.imagen}
        />
      )}

      {/* Info del producto */}
      <div style={styles.info}>
        <h3 style={styles.nombre}>{producto.nombre}</h3>
        <p style={styles.descripcion}>{producto.descripcion}</p>
        <span style={styles.precio}>{precioFormateado}</span>
      </div>

      {/* Control de cantidad */}
      <div style={styles.controles}>
        {cantidad === 0 ? (
          // Si no está en el carrito, muestra botón "Añadir"
          <button style={styles.btnAnadir} onClick={() => agregarItem(producto)}>
            + Añadir
          </button>
        ) : (
          // Si ya está, muestra los controles de cantidad
          <div style={styles.contador}>
            <button style={styles.btnContador} onClick={() => quitarItem(producto.id_producto)}>−</button>
            <span style={styles.cantidad}>{cantidad}</span>
            <button style={styles.btnContador} onClick={() => agregarItem(producto)}>+</button>
          </div>
        )}
      </div>
    </div>
  );
};

// Estilos inline básicos — los reemplazaremos con Tailwind más adelante
const styles = {
  card: {
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    backgroundColor: '#fff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  imagen: {
    width: '100%',
    height: '160px',
    objectFit: 'cover',
    borderRadius: '8px',
  },
  info: { display: 'flex', flexDirection: 'column', gap: '4px' },
  nombre: { margin: 0, fontSize: '16px', fontWeight: '700' },
  descripcion: { margin: 0, fontSize: '13px', color: '#666' },
  precio: { fontWeight: '700', color: '#2e7d32', fontSize: '15px' },
  controles: { marginTop: '8px' },
  btnAnadir: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#2e7d32',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '14px',
  },
  contador: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
  },
  btnContador: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '2px solid #2e7d32',
    backgroundColor: '#fff',
    color: '#2e7d32',
    fontSize: '20px',
    cursor: 'pointer',
    fontWeight: '700',
  },
  cantidad: { fontSize: '18px', fontWeight: '700', minWidth: '20px', textAlign: 'center' },
};

export default ProductCard;