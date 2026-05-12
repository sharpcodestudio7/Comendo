import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Search, UtensilsCrossed, ShoppingBag } from 'lucide-react';
import useMenu from '../hooks/useMenu';
import useCartStore from '../store/useCartStore';
import useActivePedido from '../hooks/useActivePedido';
import useSesionMesa from '../hooks/useSesionMesa';
import ProductCard from '../components/ProductCard';
import CartDrawer from '../components/CartDrawer';
import SkeletonCard from '../components/SkeletonCard';
import PageTransition from '../components/PageTransition';

const CATEGORIA_CSS = `
  .cart-bounce {
    animation: cartBounceAnim 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97);
  }
  @keyframes cartBounceAnim {
    0%   { transform: scale(1); }
    20%  { transform: scale(1.3) rotate(-5deg); }
    40%  { transform: scale(0.9) rotate(3deg); }
    60%  { transform: scale(1.15) rotate(-2deg); }
    80%  { transform: scale(0.95); }
    100% { transform: scale(1) rotate(0); }
  }
  .cart-counter-pop {
    animation: counterPop 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97);
  }
  @keyframes counterPop {
    0%   { transform: scale(1); }
    30%  { transform: scale(1.6); background-color: #D4922A; }
    60%  { transform: scale(0.8); }
    100% { transform: scale(1); background-color: #B87333; }
  }
  .btn-agregar-flash {
    animation: agregarFlash 0.3s ease-out;
  }
  @keyframes agregarFlash {
    0%   { box-shadow: 0 0 0 0 rgba(184, 115, 51, 0.6); }
    50%  { box-shadow: 0 0 0 8px rgba(184, 115, 51, 0); }
    100% { box-shadow: 0 0 0 0 rgba(184, 115, 51, 0); }
  }
  @property --angle {
    syntax: '<angle>';
    initial-value: 0deg;
    inherits: false;
  }
  @keyframes borderRotate {
    0%   { --angle: 0deg; }
    100% { --angle: 360deg; }
  }
  .categoria-border-glow {
    background: conic-gradient(from var(--angle), #B87333, #D4A017, #FFD700, #D4A017, #B87333, #8B6914, #B87333);
    animation: borderRotate 3s linear infinite;
    padding: 1.5px;
    border-radius: 25px;
    display: inline-block;
    flex-shrink: 0;
  }
  .categoria-inner {
    background: #0D0D0D;
    border-radius: 24px;
    padding: 8px 18px;
    color: #FFFFFF;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    display: block;
    white-space: nowrap;
    font-family: sans-serif;
  }
  .categoria-inner:active {
    opacity: 0.85;
  }
  .btn-agregar {
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }
  .btn-agregar:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 20px rgba(184, 115, 51, 0.4);
    background-color: #D4922A !important;
  }
  .btn-agregar:active {
    transform: scale(0.97);
    box-shadow: 0 2px 8px rgba(184, 115, 51, 0.3);
  }
  .btn-agregar::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    transition: width 0.4s ease, height 0.4s ease;
  }
  .btn-agregar:hover::after {
    width: 200px;
    height: 200px;
  }
  .btn-pedido {
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }
  .btn-pedido:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 25px rgba(184, 115, 51, 0.5);
    background-color: #D4922A !important;
  }
  .btn-pedido:active {
    transform: translateY(0);
    box-shadow: 0 2px 10px rgba(184, 115, 51, 0.3);
  }
`;

const MenuPage = () => {
  const { mesaId } = useParams();
  const { categorias, productos, cargando, error } = useMenu();
  const { pedidoActivo, refrescar: refrescarPedido } = useActivePedido(mesaId);
  const { esDueno, cargando: cargandoSesion } = useSesionMesa(mesaId);
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [transicionCategoria, setTransicionCategoria] = useState(false);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [tabActiva, setTabActiva] = useState('menu');
  const totalItems = useCartStore((s) => s.totalItems());
  const cartAnimationTrigger = useCartStore((s) => s.cartAnimationTrigger);
  const [cartBounce, setCartBounce] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const soloLectura = !!mesaId && !cargandoSesion && !esDueno;

  const triggerCartBounce = useCallback(() => {
    setCartBounce(true);
    setTimeout(() => setCartBounce(false), 600);
  }, []);

  useEffect(() => {
    if (cartAnimationTrigger > 0) triggerCartBounce();
  }, [cartAnimationTrigger]);

  useEffect(() => {
    document.body.style.backgroundColor = '#0D0D0D';
    return () => { document.body.style.backgroundColor = ''; };
  }, []);

  const productosFiltrados = productos.filter((p) => {
    const coincideCategoria = categoriaActiva === 'Todos' || p.categorias?.nombre === categoriaActiva;
    const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
    return coincideCategoria && coincideBusqueda;
  });

  const cambiarCategoria = (cat) => {
    setTransicionCategoria(true);
    setCategoriaActiva(cat);
    setTimeout(() => setTransicionCategoria(false), 50);
  };

  const abrirCarrito = () => {
    setCarritoAbierto(true);
    setTabActiva('pedido');
  };

  const cerrarCarrito = () => {
    setCarritoAbierto(false);
    setTabActiva('menu');
  };

  if (cargando) return (
    <PageTransition>
    <div style={styles.pagina}>
      <header style={styles.header}>
        <div style={styles.headerLogo}>
          <div style={styles.logoIcono}><UtensilsCrossed size={22} color="#C8A84E" /></div>
          <div>
            <h1 style={styles.restauranteNombre}>Mr. Arroz Paisa</h1>
            <p style={styles.restauranteSubtitulo}>— Comendo —</p>
          </div>
        </div>
        {mesaId && <div style={styles.mesaBadge}><span style={styles.mesaBadgeTexto}>Mesa {mesaId}</span></div>}
      </header>
      <div style={styles.busquedaContainer}>
        <Search size={16} color="#555" />
        <span style={{ fontSize: '15px', color: '#555' }}>Buscar</span>
      </div>
      <div style={styles.filtros}>
        {[80, 95, 70, 105].map((w, i) => (
          <div key={i} className="skeleton-bone" style={{ width: w, height: 36, borderRadius: 20, flexShrink: 0 }} />
        ))}
      </div>
      <div style={styles.lista}>
        {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
      </div>
      <nav style={styles.bottomNav}>
        <button style={styles.navItem}><UtensilsCrossed size={22} color="#C8A84E" /><span style={{ ...styles.navLabel, ...styles.navLabelActivo }}>Menú</span></button>
        <button style={styles.navItem}><ShoppingBag size={22} color="#666" /><span style={styles.navLabel}>Mi Pedido</span></button>
      </nav>
    </div>
    </PageTransition>
  );

  if (error) return (
    <div style={styles.pagina}>
      <p style={{ color: '#666', textAlign: 'center', marginTop: '80px', fontSize: '15px' }}>Error al cargar el menú</p>
    </div>
  );

  return (
    <PageTransition>
      <style>{CATEGORIA_CSS}</style>

      <div style={styles.pagina}>
        <header style={styles.header}>
          <div style={styles.headerLogo}>
            <div style={styles.logoIcono}><UtensilsCrossed size={22} color="#C8A84E" /></div>
            <div>
              <h1 style={styles.restauranteNombre}>Mr. Arroz Paisa</h1>
              <p style={styles.restauranteSubtitulo}>— Comendo —</p>
            </div>
          </div>
          {mesaId && <div style={styles.mesaBadge}><span style={styles.mesaBadgeTexto}>Mesa {mesaId}</span></div>}
        </header>

        {soloLectura && (
          <div style={styles.bannerSoloLectura}>
            <span style={{ fontSize: '20px' }}>🔒</span>
            <div>
              <p style={styles.bannerTitulo}>Mesa con sesión activa</p>
              <p style={styles.bannerSub}>Otro dispositivo ya está realizando el pedido. Solo puedes ver el menú.</p>
            </div>
          </div>
        )}

        <div style={styles.busquedaContainer}>
          <Search size={16} color="#666" />
          <input
            type="text"
            placeholder="Buscar"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={styles.busquedaInput}
          />
          {busqueda && (
            <button style={styles.busquedaLimpiar} onClick={() => setBusqueda('')}>✕</button>
          )}
        </div>

        <div style={styles.filtros}>
          {['Todos', ...categorias.map((c) => c.nombre)].map((cat) =>
            categoriaActiva === cat ? (
              <button
                key={cat}
                style={styles.filtroActivo}
                onClick={() => cambiarCategoria(cat)}
              >
                {cat}
              </button>
            ) : (
              <div key={cat} className="categoria-border-glow">
                <button className="categoria-inner" onClick={() => cambiarCategoria(cat)}>
                  {cat}
                </button>
              </div>
            )
          )}
        </div>

        <div style={styles.lista}>
          <div style={{
            opacity: transicionCategoria ? 0 : 1,
            transform: transicionCategoria ? 'translateY(8px)' : 'translateY(0)',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
          }}>
            {productosFiltrados.length === 0 ? (
              <p style={styles.sinResultados}>No se encontraron productos</p>
            ) : (
              productosFiltrados.map((producto) => (
                <ProductCard
                  key={producto.id_producto}
                  producto={producto}
                  soloLectura={soloLectura || cargandoSesion}
                />
              ))
            )}
          </div>
        </div>

        {!soloLectura && (
          <CartDrawer
            abierto={carritoAbierto}
            onCerrar={cerrarCarrito}
            mesaId={mesaId}
            pedidoActivo={pedidoActivo}
            onPedidoCreado={refrescarPedido}
          />
        )}

        <nav style={styles.bottomNav}>
          <button style={styles.navItem} onClick={() => setTabActiva('menu')}>
            <UtensilsCrossed size={22} color={tabActiva === 'menu' ? '#C8A84E' : '#666'} />
            <span style={{ ...styles.navLabel, ...(tabActiva === 'menu' ? styles.navLabelActivo : {}) }}>Menú</span>
          </button>

          <button style={styles.navItem} onClick={soloLectura ? undefined : abrirCarrito}>
            <div className={cartBounce ? 'cart-bounce' : ''} style={styles.navCartWrapper}>
              <ShoppingBag size={22} color={tabActiva === 'pedido' ? '#C8A84E' : (soloLectura ? '#444' : '#666')} />
              {!soloLectura && totalItems > 0 && <span className={cartBounce ? 'cart-counter-pop' : ''} style={styles.navBadge}>{totalItems}</span>}
            </div>
            <span style={{ ...styles.navLabel, ...(tabActiva === 'pedido' ? styles.navLabelActivo : {}), ...(soloLectura ? { color: '#444' } : {}) }}>
              Mi Pedido
            </span>
          </button>

        </nav>
      </div>
    </PageTransition>
  );
};

const styles = {
  pagina: {
    backgroundColor: '#0D0D0D',
    minHeight: '100vh',
    maxWidth: '480px',
    margin: '0 auto',
    fontFamily: 'sans-serif',
    paddingBottom: '76px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 16px 16px',
  },
  headerLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoIcono: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    backgroundColor: '#1A1A1A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #333',
    flexShrink: 0,
  },
  restauranteNombre: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '700',
    color: '#C8A84E',
    fontFamily: 'Georgia, serif',
    fontStyle: 'italic',
  },
  restauranteSubtitulo: {
    margin: '2px 0 0',
    fontSize: '12px',
    color: '#C8A84E',
    fontFamily: 'Georgia, serif',
    fontStyle: 'italic',
    opacity: 0.75,
  },
  mesaBadge: {
    backgroundColor: '#1A1A1A',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '4px 10px',
  },
  mesaBadgeTexto: {
    fontSize: '12px',
    color: '#999',
    fontWeight: '600',
  },
  bannerSoloLectura: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    backgroundColor: 'rgba(139,26,26,0.12)',
    border: '1px solid rgba(139,26,26,0.4)',
    borderRadius: '10px',
    padding: '12px 14px',
    margin: '0 16px 12px',
  },
  bannerTitulo: { margin: 0, fontSize: '14px', fontWeight: '700', color: '#e57373' },
  bannerSub: { margin: '2px 0 0', fontSize: '12px', color: '#ffcdd2' },
  busquedaContainer: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: '12px',
    padding: '12px 14px',
    margin: '0 16px 12px',
    gap: '10px',
  },
  busquedaInput: {
    flex: 1,
    border: 'none',
    background: 'transparent',
    fontSize: '15px',
    outline: 'none',
    color: '#FFFFFF',
  },
  busquedaLimpiar: {
    background: 'none',
    border: 'none',
    color: '#666',
    cursor: 'pointer',
    fontSize: '14px',
    padding: 0,
  },
  filtros: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    marginBottom: '16px',
    padding: '4px 16px 6px',
    scrollbarWidth: 'none',
    alignItems: 'center',
  },
  filtroActivo: {
    padding: '8px 18px',
    borderRadius: '25px',
    border: 'none',
    backgroundColor: '#8B1A1A',
    color: '#FFFFFF',
    cursor: 'pointer',
    fontWeight: '700',
    whiteSpace: 'nowrap',
    fontSize: '13px',
    flexShrink: 0,
    fontFamily: 'sans-serif',
  },
  lista: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '0 16px',
  },
  sinResultados: {
    textAlign: 'center',
    color: '#666',
    marginTop: '40px',
    fontSize: '15px',
  },
  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: '480px',
    height: '60px',
    backgroundColor: '#1A1A1A',
    borderTop: '1px solid #333',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    zIndex: 50,
  },
  navItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '3px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px 0',
    minHeight: '44px',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: '10px',
    color: '#666',
    fontWeight: '500',
  },
  navLabelActivo: { color: '#C8A84E' },
  navCartWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBadge: {
    position: 'absolute',
    top: '-6px',
    right: '-8px',
    backgroundColor: '#C8A84E',
    color: '#0D0D0D',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: '700',
    minWidth: '16px',
    height: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 3px',
  },
};

export default MenuPage;
