// src/pages/MenuPage.jsx
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import useMenu from '../hooks/useMenu';
import useCartStore from '../store/useCartStore';
import ProductCard from '../components/ProductCard';
import CartDrawer from '../components/CartDrawer';

const MenuPage = () => {
  // ✅ useParams DENTRO del componente, junto a los demás hooks
  const { mesaId } = useParams();

  const { categorias, productos, cargando, error } = useMenu();
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const totalItems = useCartStore((s) => s.totalItems());

  const productosFiltrados =
    categoriaActiva === 'Todos'
      ? productos
      : productos.filter((p) => p.categorias?.nombre === categoriaActiva);

  if (cargando) return <p style={styles.mensaje}>Cargando menú...</p>;
  if (error)    return <p style={styles.mensaje}>Error: {error}</p>;

  return (
    <div style={styles.pagina}>
      <header style={styles.header}>
        <h1 style={styles.titulo}>🍽 Mr. Arroz Paisa</h1>
   
        <div style={styles.carrito} onClick={() => setCarritoAbierto(true)}>
          🛒 <span>{totalItems}</span>
        </div>
      </header>

      <div style={styles.filtros}>
        {['Todos', ...categorias.map((c) => c.nombre)].map((cat) => (
          <button
            key={cat}
            style={{
              ...styles.filtroBtn,
              ...(categoriaActiva === cat ? styles.filtroActivo : {}),
            }}
            onClick={() => setCategoriaActiva(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div style={styles.grid}>
        {productosFiltrados.map((producto) => (
          <ProductCard key={producto.id_producto} producto={producto} />
        ))}
      </div>

      {/* ✅ mesaId ya fluye hacia el CartDrawer */}
      <CartDrawer
        abierto={carritoAbierto}
        onCerrar={() => setCarritoAbierto(false)}
        mesaId={mesaId}
      />
    </div>
  );
};

const styles = {
  pagina: { maxWidth: '480px', margin: '0 auto', padding: '16px', fontFamily: 'sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  titulo: { margin: 0, fontSize: '20px' },
  carrito: { fontSize: '20px', fontWeight: '700', cursor: 'pointer' },
  filtros: { display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '16px', paddingBottom: '4px' },
  filtroBtn: {
    padding: '8px 16px', borderRadius: '20px',
    border: '2px solid #2e7d32', backgroundColor: '#fff',
    color: '#2e7d32', cursor: 'pointer', fontWeight: '600', whiteSpace: 'nowrap',
  },
  filtroActivo: { backgroundColor: '#2e7d32', color: '#fff' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  mensaje: { textAlign: 'center', marginTop: '40px', fontSize: '16px' },
};

export default MenuPage;