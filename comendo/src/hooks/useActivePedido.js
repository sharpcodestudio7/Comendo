// src/hooks/useActivePedido.js
// Detecta si una mesa ya tiene un pedido activo (Recibido, Preparando o Listo).

import { useState, useEffect } from 'react';
import { supabase } from '../api/supabase';

const useActivePedido = (mesaId) => {
  const [pedidoActivo, setPedidoActivo] = useState(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!mesaId) return;

    const buscar = async () => {
      setCargando(true);
      const { data } = await supabase
        .from('pedidos')
        .select('id_pedido, estado_actual, total, metodo_pago, fecha_creacion')
        .eq('id_mesa', mesaId)
        .in('estado_actual', ['Recibido', 'Preparando'])
        .order('fecha_creacion', { ascending: false })
        .limit(1)
        .maybeSingle();

      setPedidoActivo(data || null);
      setCargando(false);
    };

    buscar();
  }, [mesaId]);

  const refrescar = async () => {
    if (!mesaId) return;
    const { data } = await supabase
      .from('pedidos')
      .select('id_pedido, estado_actual, total, metodo_pago, fecha_creacion')
      .eq('id_mesa', mesaId)
      .in('estado_actual', ['Recibido', 'Preparando'])
      .order('fecha_creacion', { ascending: false })
      .limit(1)
      .maybeSingle();
    setPedidoActivo(data || null);
  };

  return { pedidoActivo, cargando, refrescar };
};

export default useActivePedido;
