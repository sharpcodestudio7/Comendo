// src/api/orderService.js
// Servicio encargado de persistir un pedido completo en Supabase.
// Realiza dos inserciones en secuencia:
//   1. Crea el registro en la tabla 'pedidos'
//   2. Inserta cada item del carrito en 'detalle_pedidos'

import { supabase } from './supabase';

/**
 * Crea un pedido completo en la base de datos.
 * @param {string} mesaId  - UUID de la mesa (viene de useParams)
 * @param {Array}  items   - Array del carrito: [{ producto, cantidad }]
 * @returns {Object}       - El pedido creado con su id_pedido
 */
export const crearPedido = async (mesaId, items) => {

  // ── Calcular totales ──────────────────────────────────────────────────────
  const subtotal = items.reduce((acc, i) => acc + i.producto.precio * i.cantidad, 0);
  const total = subtotal * 1.08; // Impoconsumo 8%

  // ── Insertar el pedido principal ──────────────────────────────────────────
  const { data: pedido, error: errorPedido } = await supabase
    .from('pedidos')
    .insert({
      id_mesa: mesaId || null,
      total: parseFloat(total.toFixed(2)),
      estado_actual: 'Recibido',
    })
    .select()
    .single();

  if (errorPedido) throw new Error(`Error al crear pedido: ${errorPedido.message}`);

  // ── Insertar el detalle (un registro por cada item del carrito) ───────────
  const detalle = items.map((i) => ({
    id_pedido: pedido.id_pedido,
    id_producto: i.producto.id_producto,
    cantidad: i.cantidad,
    precio_unitario: i.producto.precio,
    subtotal: parseFloat((i.producto.precio * i.cantidad).toFixed(2)),
  }));

  const { error: errorDetalle } = await supabase
    .from('detalle_pedidos')
    .insert(detalle);

  if (errorDetalle) throw new Error(`Error al guardar detalle: ${errorDetalle.message}`);

  return pedido;
};