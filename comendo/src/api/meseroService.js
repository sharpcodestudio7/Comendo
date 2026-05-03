// src/api/meseroService.js
// Auto-asignación de meseros por menor carga de pedidos activos.

import { supabase } from './supabase';

/**
 * Asigna automáticamente el mesero con menos pedidos en estado "Listo"
 * al pedido indicado. Si no hay meseros registrados, no hace nada.
 * @param {string} pedidoId - UUID del pedido recién marcado como Listo
 * @returns {Object|null}   - Mesero asignado { id_usuario, nombre } o null
 */
export const asignarMeseroAutomatico = async (pedidoId) => {
  // 1. Obtener todos los meseros activos
  const { data: meseros } = await supabase
    .from('usuarios')
    .select('id_usuario, nombre, email')
    .eq('rol', 'Mesero');

  if (!meseros || meseros.length === 0) return null;

  // 2. Contar cuántos pedidos "Listo" tiene asignado cada mesero ahora mismo
  const { data: pedidosActivos } = await supabase
    .from('pedidos')
    .select('id_mesero')
    .eq('estado_actual', 'Listo')
    .not('id_mesero', 'is', null);

  const carga = {};
  meseros.forEach((m) => { carga[m.id_usuario] = 0; });
  pedidosActivos?.forEach(({ id_mesero }) => {
    if (carga[id_mesero] !== undefined) carga[id_mesero]++;
  });

  // 3. Elegir el mesero con menor carga (empate → primero en la lista)
  const meseroElegido = meseros.reduce((min, m) =>
    carga[m.id_usuario] < carga[min.id_usuario] ? m : min
  );

  // 4. Asignar al pedido
  await supabase
    .from('pedidos')
    .update({ id_mesero: meseroElegido.id_usuario })
    .eq('id_pedido', pedidoId);

  return meseroElegido;
};
