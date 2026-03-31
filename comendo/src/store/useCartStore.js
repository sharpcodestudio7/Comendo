// src/store/useCartStore.js
// Store global del carrito usando Zustand.
// Usa id_producto como identificador único (nombre real en la BD).

import { create } from 'zustand';

const useCartStore = create((set, get) => ({
  // Array de items: { producto, cantidad }
  items: [],

  // Agrega producto. Si ya existe, incrementa cantidad.
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

  // Reduce cantidad en 1. Si llega a 0, elimina el item.
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

  // Vacía el carrito completo.
  limpiarCarrito: () => set({ items: [] }),

  // Total de unidades en el carrito.
  totalItems: () => get().items.reduce((acc, i) => acc + i.cantidad, 0),

  // Subtotal en pesos.
  subtotal: () =>
    get().items.reduce((acc, i) => acc + i.producto.precio * i.cantidad, 0),
}));

export default useCartStore;