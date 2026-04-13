// src/api/orderService.js
import { supabase } from './supabase';

/**
 * Crea un pedido completo y descuenta el inventario automáticamente.
 * @param {string} mesaId  - UUID de la mesa
 * @param {Array}  items   - Array del carrito: [{ producto, cantidad }]
 * @returns {Object}       - El pedido creado
 */
export const crearPedido = async (mesaId, items) => {

  // ── PASO 1: Calcular totales ──────────────────────────────────────────
  const subtotal = items.reduce((acc, i) => acc + i.producto.precio * i.cantidad, 0);
  const total = subtotal * 1.08; // Impoconsumo 8%

  // ── PASO 2: Insertar el pedido principal ──────────────────────────────
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

  // ── PASO 3: Insertar detalle del pedido ───────────────────────────────
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

  // ── PASO 4: Descontar inventario según recetas (RF-3.1) ───────────────
  // Para cada item del carrito buscamos su receta y descontamos los insumos
  for (const item of items) {
    const { data: recetas } = await supabase
      .from('recetas')
      .select('id_insumo, cantidad_requerida')
      .eq('id_producto', item.producto.id_producto);

    if (!recetas || recetas.length === 0) continue;

    for (const receta of recetas) {
      // Cantidad total a descontar = cantidad_requerida × unidades pedidas
      const cantidadADescontar = receta.cantidad_requerida * item.cantidad;

      // Obtenemos el stock actual del insumo
      const { data: insumo } = await supabase
        .from('insumos')
        .select('cantidad_stock')
        .eq('id_insumo', receta.id_insumo)
        .single();

      if (!insumo) continue;

      // Calculamos el nuevo stock — nunca baja de 0
      const nuevoStock = Math.max(0, insumo.cantidad_stock - cantidadADescontar);

      // Actualizamos el stock en la base de datos
      await supabase
        .from('insumos')
        .update({ cantidad_stock: nuevoStock })
        .eq('id_insumo', receta.id_insumo);
    }
  }

  return pedido;
};