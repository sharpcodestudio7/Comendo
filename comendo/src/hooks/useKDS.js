// src/hooks/useKDS.js
import { useState, useEffect } from 'react';
import { supabase } from '../api/supabase';
import useKDSSound from './useKDSSound';

const ESTADOS_KDS = ['Recibido', 'Preparando', 'Listo'];

// Minutos que un pedido "Listo" permanece visible en el KDS antes de archivarse
const MINUTOS_VISIBLE_LISTO = 2;

const useKDS = () => {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const { sonarNuevoPedido } = useKDSSound();

  // ── Carga inicial ─────────────────────────────────────────────────────
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
            // 🔔 Suena alerta al recibir nuevo pedido
            sonarNuevoPedido();
            cargarPedidos();
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
                        // Si acaba de pasar a Listo, guardamos el timestamp exacto
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
    }, 5000); // Revisa cada 5 segundos

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
    }
  };

  return { pedidos, cargando, error, cambiarEstado, ESTADOS_KDS };
};

export default useKDS;