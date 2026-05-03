// src/hooks/useKDS.js
// Hook del Kitchen Display System.
// Ahora trae las exclusiones de ingredientes y notas de cada detalle de pedido.

import { useState, useEffect } from 'react';
import { supabase } from '../api/supabase';
import useKDSSound from './useKDSSound';
import { asignarMeseroAutomatico } from '../api/meseroService';

const ESTADOS_KDS = ['Recibido', 'Preparando', 'Listo'];
const MINUTOS_VISIBLE_LISTO = 2;

const useKDS = () => {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const { sonarNuevoPedido } = useKDSSound();

  // ── Carga inicial (ahora incluye notas y exclusiones) ─────────────────
  const cargarPedidos = async () => {
    const { data, error } = await supabase
      .from('pedidos')
      .select(`
        id_pedido,
        estado_actual,
        fecha_creacion,
        id_mesero,
        mesero:usuarios!pedidos_id_mesero_fkey ( nombre ),
        mesas ( numero ),
        detalle_pedidos (
          id_detalle,
          cantidad,
          notas,
          productos ( nombre ),
          exclusiones_pedido (
            id_insumo,
            nombre_insumo,
            cantidad_no_descontada,
            unidad_medida
          )
        )
      `)
      .in('estado_actual', ESTADOS_KDS)
      .order('fecha_creacion', { ascending: true });

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

  // ── Realtime ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canal = supabase
      .channel('kds-pedidos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            sonarNuevoPedido();
            cargarPedidos(); // Recarga completa para traer exclusiones y notas
          }

          if (payload.eventType === 'UPDATE') {
            const estadoNuevo = payload.new.estado_actual;

            if (ESTADOS_KDS.includes(estadoNuevo)) {
              setPedidos((prev) =>
                prev.map((p) =>
                  p.id_pedido === payload.new.id_pedido
                    ? {
                        ...p,
                        estado_actual: estadoNuevo,
                        fecha_listo: estadoNuevo === 'Listo'
                          ? new Date().toISOString()
                          : p.fecha_listo,
                      }
                    : p
                )
              );
            } else {
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

  // ── Auto-limpieza de pedidos Listos ───────────────────────────────────
  useEffect(() => {
    const intervalo = setInterval(() => {
      const ahora = new Date();
      setPedidos((prev) =>
        prev.filter((p) => {
          if (p.estado_actual !== 'Listo') return true;
          const fechaReferencia = p.fecha_listo
            ? new Date(p.fecha_listo)
            : new Date(p.fecha_creacion);
          const minutosEnListo = (ahora - fechaReferencia) / 60000;
          return minutosEnListo < MINUTOS_VISIBLE_LISTO;
        })
      );
    }, 5000);

    return () => clearInterval(intervalo);
  }, [pedidos]);

  // ── Cambiar estado manualmente ────────────────────────────────────────
  const cambiarEstado = async (pedidoId, nuevoEstado) => {
    const { error } = await supabase
      .from('pedidos')
      .update({ estado_actual: nuevoEstado })
      .eq('id_pedido', pedidoId);

    if (error) {
      console.error('Error al cambiar estado:', error.message);
      return;
    }

    // Auto-asignar mesero cuando el pedido pasa a Listo
    if (nuevoEstado === 'Listo') {
      await asignarMeseroAutomatico(pedidoId);
      cargarPedidos(); // Recargar para mostrar el mesero asignado
    }
  };

  return { pedidos, cargando, error, cambiarEstado, ESTADOS_KDS };
};

export default useKDS;