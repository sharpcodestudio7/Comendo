import { create } from 'zustand';

const useCartStore = create((set, get) => ({
  items: [],

  agregarItem: (producto) => {
    const { items } = get();
    const existe = items.find((i) => i.producto.id_producto === producto.id_producto);
    if (existe) {
      set({
        items: items.map((i) =>
          i.producto.id_producto === producto.id_producto
            ? { ...i, cantidad: i.cantidad + 1 }
            : i
        ),
      });
    } else {
      set({ items: [...items, { producto, cantidad: 1 }] });
    }
  },

  quitarItem: (productoId) => {
    const { items } = get();
    const item = items.find((i) => i.producto.id_producto === productoId);
    if (!item) return;
    if (item.cantidad === 1) {
      set({ items: items.filter((i) => i.producto.id_producto !== productoId) });
    } else {
      set({
        items: items.map((i) =>
          i.producto.id_producto === productoId
            ? { ...i, cantidad: i.cantidad - 1 }
            : i
        ),
      });
    }
  },

  // 👈 NUEVA ACCIÓN
  eliminarItem: (productoId) => {
    set({ items: get().items.filter((i) => i.producto.id_producto !== productoId) });
  },

  limpiarCarrito: () => set({ items: [] }),

  totalItems: () => get().items.reduce((acc, i) => acc + i.cantidad, 0),

  subtotal: () =>
    get().items.reduce((acc, i) => acc + i.producto.precio * i.cantidad, 0),
}));

export default useCartStore;