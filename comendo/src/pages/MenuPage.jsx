// src/pages/MenuPage.jsx
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import useMenu from '../hooks/useMenu';
import useCartStore from '../store/useCartStore';
import ProductCard from '../components/ProductCard';
import CartDrawer from '../components/CartDrawer';
import SkeletonCard from '../components/SkeletonCard';

const MenuPage = () => {
  // ✅ useParams DENTRO del componente, junto a los demás hooks
  const { mesaId } = useParams();

  const { categorias, productos, cargando, error } = useMenu();
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const totalItems = useCartStore((s) => s.totalItems());
  const [busqueda, setBusqueda] = useState('');

  const productosFiltrados =
  productos.filter((p) => {
    const coincideCategoria = categoriaActiva === 'Todos' || p.categorias?.nombre === categoriaActiva;
    const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
    return coincideCategoria && coincideBusqueda;
  });

  if (cargando) return (
  <div style={styles.pagina}>
    <header style={styles.header}>
      <h1 style={styles.titulo}>🍽 Mr. Arroz Paisa</h1>
      <div style={styles.carrito}>🛒 <span>0</span></div>
    </header>

    {/* Filtros skeleton */}
    <div style={styles.filtros}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} style={{
          width: '80px', height: '36px', borderRadius: '20px',
          background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
          flexShrink: 0,
        }} />
      ))}
    </div>

    {/* Grid skeleton — 4 tarjetas */}
    <div style={styles.grid}>
      {[1, 2, 3, 4].map((i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  </div>
);
  if (error)    return <p style={styles.mensaje}>Error: {error}</p>;

  return (
    <div style={styles.pagina}>
      <header style={styles.header}>
        <h1 style={styles.titulo}>🍽 Mr. Arroz Paisa</h1>
   
        <div style={styles.carrito} onClick={() => setCarritoAbierto(true)}>
          🛒 <span>{totalItems}</span>
        </div>
      </header>
      {/* Barra de búsqueda */}
      <div style={styles.busquedaContainer}>
        <span style={styles.busquedaIcono}>🔍</span>
        <input
          type="text"
          placeholder="Buscar platos..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={styles.busquedaInput}
        />
        {busqueda && (
          <button
            style={styles.busquedaLimpiar}
            onClick={() => setBusqueda('')}
          >
            ✕
          </button>
        )}
      </div>
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
  busquedaContainer: {
  display: 'flex', alignItems: 'center',
  backgroundColor: '#f5f5f5',
  borderRadius: '12px', padding: '10px 14px',
  marginBottom: '12px', gap: '8px',
  border: '1px solid #e0e0e0',
},
busquedaIcono: { fontSize: '16px', color: '#888' },
busquedaInput: {
  flex: 1, border: 'none', background: 'transparent',
  fontSize: '15px', outline: 'none', color: '#333',
},
busquedaLimpiar: {
  background: 'none', border: 'none',
  color: '#888', cursor: 'pointer',
  fontSize: '14px', padding: '0',
},
};

export default MenuPage;