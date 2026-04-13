// src/hooks/useKDS.js
import { useState, useEffect } from 'react';
import { supabase } from '../api/supabase';

const ESTADOS_KDS = ['Recibido', 'Preparando', 'Listo'];

// Minutos que un pedido "Listo" permanece visible en el KDS antes de archivarse
const MINUTOS_VISIBLE_LISTO = 2;

const useKDS = () => {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

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
            cargarPedidos();
          }
          if (payload.eventType === 'UPDATE') {
            const estadoNuevo = payload.new.estado_actual;
            if (ESTADOS_KDS.includes(estadoNuevo)) {
              setPedidos((prev) =>
                prev.map((p) =>
                  p.id_pedido === payload.new.id_pedido
                    ? { ...p, estado_actual: estadoNuevo }
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
  // Cada 30 segundos revisa si hay pedidos "Listo" que llevan más de
  // MINUTOS_VISIBLE_LISTO minutos y los cambia a "Entregado" automáticamente
  useEffect(() => {
    const intervalo = setInterval(async () => {
      const ahora = new Date();

      const pedidosAArchivar = pedidos.filter((p) => {
        if (p.estado_actual !== 'Listo') return false;
        const minutosEnListo = (ahora - new Date(p.fecha_creacion)) / 60000;
        return minutosEnListo >= MINUTOS_VISIBLE_LISTO;
      });

      for (const pedido of pedidosAArchivar) {
        await supabase
          .from('pedidos')
          .update({ estado_actual: 'Entregado' })
          .eq('id_pedido', pedido.id_pedido);
      }

      // Si archivamos alguno, los quitamos del estado local
      if (pedidosAArchivar.length > 0) {
        setPedidos((prev) =>
          prev.filter((p) => !pedidosAArchivar.find((a) => a.id_pedido === p.id_pedido))
        );
      }
    }, 30000); // Revisa cada 30 segundos

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