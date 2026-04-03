// src/hooks/useKDS.js
// Hook personalizado que maneja toda la lógica del KDS:
// 1. Carga inicial de pedidos activos desde Supabase
// 2. Suscripción Realtime para recibir nuevos pedidos automáticamente
// 3. Función para cambiar el estado de un pedido

import { useState, useEffect } from 'react';
import { supabase } from '../api/supabase';

// Estados que le interesan a la cocina — en este orden de flujo
const ESTADOS_KDS = ['Recibido', 'Preparando', 'Listo'];

const useKDS = () => {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // ── PASO 1: Carga inicial de pedidos activos ────────────────────────────
  const cargarPedidos = async () => {
    const { data, error } = await supabase
      .from('pedidos')
      .select(`
        id_pedido,
        estado_actual,
        fecha_creacion,
        mesas ( numero ),
        detalle_pedidos (
          cantidad,
          productos ( nombre )
        )
      `)
      // Solo traemos pedidos que la cocina todavía debe atender
      .in('estado_actual', ESTADOS_KDS)
      .order('fecha_creacion', { ascending: true }); // FIFO: primero el más antiguo

    if (error) {
      setError(error.message);
    } else {
      setPedidos(data);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarPedidos();
  }, []);

  // ── PASO 2: Suscripción Realtime ────────────────────────────────────────
  useEffect(() => {
    const canal = supabase
      .channel('kds-pedidos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Nuevo pedido: lo recargamos completo para tener el join con detalle
            cargarPedidos();
          }

          if (payload.eventType === 'UPDATE') {
            const estadoNuevo = payload.new.estado_actual;

            if (ESTADOS_KDS.includes(estadoNuevo)) {
              // Actualizamos solo el estado del pedido que cambió
              setPedidos((prev) =>
                prev.map((p) =>
                  p.id_pedido === payload.new.id_pedido
                    ? { ...p, estado_actual: estadoNuevo }
                    : p
                )
              );
            } else {
              // Si el estado ya no le interesa a cocina (ej: Entregado, Pagado)
              // lo removemos del tablero
              setPedidos((prev) =>
                prev.filter((p) => p.id_pedido !== payload.new.id_pedido)
              );
            }
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(canal);
  }, []);

  // ── PASO 3: Cambiar estado de un pedido ────────────────────────────────
  const cambiarEstado = async (pedidoId, nuevoEstado) => {
    const { error } = await supabase
      .from('pedidos')
      .update({ estado_actual: nuevoEstado })
      .eq('id_pedido', pedidoId);

    if (error) {
      console.error('Error al cambiar estado:', error.message);
    }
    // No necesitamos actualizar el estado local manualmente:
    // el canal Realtime de arriba lo hace automáticamente
  };

  return { pedidos, cargando, error, cambiarEstado, ESTADOS_KDS };
};

export default useKDS;