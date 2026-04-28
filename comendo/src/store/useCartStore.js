// src/store/useCartStore.js
// Store global del carrito con Zustand.
// Cada item ahora puede tener exclusiones de ingredientes y notas para cocina.

import { create } from 'zustand';

const useCartStore = create((set, get) => ({
  items: [],
  // Estructura de cada item:
  // {
  //   producto: { id_producto, nombre, precio, ... },
  //   cantidad: 1,
  //   exclusiones: [{ id_insumo, nombre, cantidad_requerida, unidad_medida }],
  //   notas: ''
  // }

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
      // Al agregar por primera vez, inicializa exclusiones vacías y notas vacías
      set({ items: [...items, { producto, cantidad: 1, exclusiones: [], notas: '' }] });
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

  eliminarItem: (productoId) => {
    set({ items: get().items.filter((i) => i.producto.id_producto !== productoId) });
  },

  // ── NUEVAS ACCIONES ──────────────────────────────────────────────────

  // Alterna un insumo como excluido/incluido para un producto específico
  toggleExclusion: (productoId, insumo) => {
    set({
      items: get().items.map((i) => {
        if (i.producto.id_producto !== productoId) return i;

        const yaExcluido = i.exclusiones.some((e) => e.id_insumo === insumo.id_insumo);

        return {
          ...i,
          exclusiones: yaExcluido
            ? i.exclusiones.filter((e) => e.id_insumo !== insumo.id_insumo)
            : [...i.exclusiones, insumo],
        };
      }),
    });
  },

  // Actualiza las notas de texto libre para un producto específico
  setNotas: (productoId, notas) => {
    set({
      items: get().items.map((i) =>
        i.producto.id_producto === productoId ? { ...i, notas } : i
      ),
    });
  },

  limpiarCarrito: () => set({ items: [] }),

  totalItems: () => get().items.reduce((acc, i) => acc + i.cantidad, 0),

  subtotal: () =>
    get().items.reduce((acc, i) => acc + i.producto.precio * i.cantidad, 0),
}));

export default useCartStore;