// src/api/orderService.js
// Servicio para crear pedidos con soporte de exclusiones de ingredientes y notas.
// Las exclusiones evitan el descuento de insumos específicos del inventario (RF-3.1).

import { supabase } from './supabase';

/**
 * Crea un pedido completo, guarda exclusiones y descuenta inventario.
 * @param {string} mesaId      - UUID de la mesa
 * @param {Array}  items       - Array del carrito: [{ producto, cantidad, exclusiones, notas }]
 * @param {string} metodoPago  - 'efectivo' | 'nequi' | 'daviplata' | null
 * @returns {Object}           - El pedido creado
 */
export const crearPedido = async (mesaId, items, metodoPago = null) => {

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
      metodo_pago: metodoPago,
    })
    .select()
    .single();

  if (errorPedido) throw new Error(`Error al crear pedido: ${errorPedido.message}`);

  // Actualiza el estado de la mesa a Ocupada
  if (mesaId) {
    await supabase
      .from('mesas')
      .update({ estado: 'Ocupada' })
      .eq('id_mesa', mesaId);
  }

  // ── PASO 3: Insertar detalle del pedido (ahora con notas) ─────────────
  const detalle = items.map((i) => ({
    id_pedido: pedido.id_pedido,
    id_producto: i.producto.id_producto,
    cantidad: i.cantidad,
    precio_unitario: i.producto.precio,
    subtotal: parseFloat((i.producto.precio * i.cantidad).toFixed(2)),
    notas: i.notas || null,  // ← Campo nuevo: notas del comensal
  }));

  const { data: detallesInsertados, error: errorDetalle } = await supabase
    .from('detalle_pedidos')
    .insert(detalle)
    .select(); // ← Necesitamos los IDs para vincular las exclusiones

  if (errorDetalle) throw new Error(`Error al guardar detalle: ${errorDetalle.message}`);

  // ── PASO 4: Insertar exclusiones por cada detalle ─────────────────────
  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const detalleGuardado = detallesInsertados[idx];

    // Si este item tiene exclusiones, las guardamos en la tabla
    if (item.exclusiones && item.exclusiones.length > 0) {
      const exclusionesParaInsertar = item.exclusiones.map((exc) => ({
        id_detalle: detalleGuardado.id_detalle,
        id_insumo: exc.id_insumo,
        nombre_insumo: exc.nombre,
        cantidad_no_descontada: exc.cantidad_requerida * item.cantidad,
        unidad_medida: exc.unidad_medida,
      }));

      const { error: errorExclusiones } = await supabase
        .from('exclusiones_pedido')
        .insert(exclusionesParaInsertar);

      if (errorExclusiones) {
        console.error('Error al guardar exclusiones:', errorExclusiones);
      }
    }
  }

  // ── PASO 5: Descontar inventario RESPETANDO exclusiones (RF-3.1) ──────
  for (const item of items) {
    // Obtener los IDs de insumos excluidos para este producto
    const idsExcluidos = (item.exclusiones || []).map((e) => e.id_insumo);

    const { data: recetas } = await supabase
      .from('recetas')
      .select('id_insumo, cantidad_requerida')
      .eq('id_producto', item.producto.id_producto);

    if (!recetas || recetas.length === 0) continue;

    for (const receta of recetas) {
      // Si este insumo fue excluido, NO lo descontamos
      if (idsExcluidos.includes(receta.id_insumo)) {
        console.log(`⏭ Insumo ${receta.id_insumo} excluido, no se descuenta`);
        continue;
      }

      const cantidadADescontar = receta.cantidad_requerida * item.cantidad;

      const { data: insumo } = await supabase
        .from('insumos')
        .select('cantidad_stock')
        .eq('id_insumo', receta.id_insumo)
        .single();

      if (!insumo) continue;

      const cantidadAnterior = insumo.cantidad_stock;
      const nuevoStock = Math.max(0, cantidadAnterior - cantidadADescontar);

      // Actualiza el stock
      await supabase
        .from('insumos')
        .update({ cantidad_stock: nuevoStock })
        .eq('id_insumo', receta.id_insumo);

      // Registra el movimiento automático
      await supabase
        .from('movimientos_inventario')
        .insert({
          id_insumo: receta.id_insumo,
          tipo: 'Salida',
          cantidad: cantidadADescontar,
          cantidad_anterior: cantidadAnterior,
          cantidad_nueva: nuevoStock,
          motivo: 'Pedido confirmado',
          id_pedido: pedido.id_pedido,
        });
    }
  }

  return pedido;
};

/**
 * Agrega items a un pedido existente, descuenta inventario y actualiza el total.
 * @param {string} pedidoId    - UUID del pedido existente
 * @param {Array}  items       - Array del carrito: [{ producto, cantidad, exclusiones, notas }]
 * @param {string} metodoPago  - 'efectivo' | 'nequi' | 'daviplata' | null (actualiza si se provee)
 * @returns {Object}           - { id_pedido }
 */
export const agregarItemsPedido = async (pedidoId, items, metodoPago = null) => {

  // ── PASO 1: Calcular subtotal de los nuevos items ──────────────────────
  const nuevoSubtotal = items.reduce((acc, i) => acc + i.producto.precio * i.cantidad, 0);
  const nuevoTotal = nuevoSubtotal * 1.08;

  // ── PASO 2: Obtener total actual del pedido ────────────────────────────
  const { data: pedidoActual, error: errorGet } = await supabase
    .from('pedidos')
    .select('total')
    .eq('id_pedido', pedidoId)
    .single();

  if (errorGet || !pedidoActual) throw new Error('Pedido no encontrado');

  const totalActualizado = parseFloat((pedidoActual.total + nuevoTotal).toFixed(2));

  // ── PASO 3: Actualizar total (y método de pago si se provee) ───────────
  const updateData = { total: totalActualizado };
  if (metodoPago) updateData.metodo_pago = metodoPago;

  await supabase
    .from('pedidos')
    .update(updateData)
    .eq('id_pedido', pedidoId);

  // ── PASO 4: Insertar nuevos detalles ───────────────────────────────────
  const detalle = items.map((i) => ({
    id_pedido: pedidoId,
    id_producto: i.producto.id_producto,
    cantidad: i.cantidad,
    precio_unitario: i.producto.precio,
    subtotal: parseFloat((i.producto.precio * i.cantidad).toFixed(2)),
    notas: i.notas || null,
  }));

  const { data: detallesInsertados, error: errorDetalle } = await supabase
    .from('detalle_pedidos')
    .insert(detalle)
    .select();

  if (errorDetalle) throw new Error(`Error al agregar items: ${errorDetalle.message}`);

  // ── PASO 5: Insertar exclusiones de los nuevos items ──────────────────
  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const detalleGuardado = detallesInsertados[idx];

    if (item.exclusiones && item.exclusiones.length > 0) {
      const exclusionesParaInsertar = item.exclusiones.map((exc) => ({
        id_detalle: detalleGuardado.id_detalle,
        id_insumo: exc.id_insumo,
        nombre_insumo: exc.nombre,
        cantidad_no_descontada: exc.cantidad_requerida * item.cantidad,
        unidad_medida: exc.unidad_medida,
      }));

      await supabase.from('exclusiones_pedido').insert(exclusionesParaInsertar);
    }
  }

  // ── PASO 6: Descontar inventario respetando exclusiones (RF-3.1) ───────
  for (const item of items) {
    const idsExcluidos = (item.exclusiones || []).map((e) => e.id_insumo);

    const { data: recetas } = await supabase
      .from('recetas')
      .select('id_insumo, cantidad_requerida')
      .eq('id_producto', item.producto.id_producto);

    if (!recetas || recetas.length === 0) continue;

    for (const receta of recetas) {
      if (idsExcluidos.includes(receta.id_insumo)) continue;

      const cantidadADescontar = receta.cantidad_requerida * item.cantidad;

      const { data: insumo } = await supabase
        .from('insumos')
        .select('cantidad_stock')
        .eq('id_insumo', receta.id_insumo)
        .single();

      if (!insumo) continue;

      const cantidadAnterior = insumo.cantidad_stock;
      const nuevoStock = Math.max(0, cantidadAnterior - cantidadADescontar);

      await supabase
        .from('insumos')
        .update({ cantidad_stock: nuevoStock })
        .eq('id_insumo', receta.id_insumo);

      await supabase
        .from('movimientos_inventario')
        .insert({
          id_insumo: receta.id_insumo,
          tipo: 'Salida',
          cantidad: cantidadADescontar,
          cantidad_anterior: cantidadAnterior,
          cantidad_nueva: nuevoStock,
          motivo: 'Adición a pedido existente',
          id_pedido: pedidoId,
        });
    }
  }

  return { id_pedido: pedidoId };
};