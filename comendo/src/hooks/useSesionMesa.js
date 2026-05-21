import { useState, useEffect, useRef } from 'react';
import { supabase } from '../api/supabase';

const STORAGE_PREFIX = 'comendo_session_';
const STORAGE_EXPIRY_PREFIX = 'comendo_session_expiry_';
const EXPIRY_MS = 10 * 60 * 1000; // 10 minutos sin pedido

const hayPedidoActivo = async (mesaId) => {
  const { data } = await supabase
    .from('pedidos')
    .select('id_pedido')
    .eq('id_mesa', mesaId)
    .in('estado_actual', ['Recibido', 'Preparando', 'Listo', 'Entregado'])
    .limit(1)
    .maybeSingle();
  return !!data;
};

const limpiarSesionLocal = (mesaId) => {
  localStorage.removeItem(`${STORAGE_PREFIX}${mesaId}`);
  localStorage.removeItem(`${STORAGE_EXPIRY_PREFIX}${mesaId}`);
};

const useSesionMesa = (mesaId) => {
  const [esDueno, setEsDueno] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [numeroMesa, setNumeroMesa] = useState(null);
  const [sesionExpirada, setSesionExpirada] = useState(false);
  const esDuenoRef = useRef(false);

  useEffect(() => {
    esDuenoRef.current = esDueno;
  }, [esDueno]);

  useEffect(() => {
    if (!mesaId) {
      setCargando(false);
      return;
    }

    const reclamarSesion = async () => {
      const tokenLocal = localStorage.getItem(`${STORAGE_PREFIX}${mesaId}`);

      const { data: mesa } = await supabase
        .from('mesas')
        .select('token_sesion_actual, numero')
        .eq('id_mesa', mesaId)
        .single();

      if (!mesa) {
        setCargando(false);
        return;
      }
      setNumeroMesa(mesa.numero);

      // Este dispositivo ya es dueño (mismo token en DB y localStorage)
      if (mesa.token_sesion_actual && tokenLocal === mesa.token_sesion_actual) {
        const expiry = localStorage.getItem(`${STORAGE_EXPIRY_PREFIX}${mesaId}`);
        // Si hay expiración pendiente y ya venció, verificar si hay pedido
        if (expiry && Date.now() > parseInt(expiry)) {
          const tienePedido = await hayPedidoActivo(mesaId);
          if (!tienePedido) {
            limpiarSesionLocal(mesaId);
            await supabase.from('mesas').update({ token_sesion_actual: null, token_creado_en: null }).eq('id_mesa', mesaId);
            setEsDueno(false);
            setSesionExpirada(true);
            setCargando(false);
            return;
          }
          // Tiene pedido → eliminar expiración, la sesión continúa
          localStorage.removeItem(`${STORAGE_EXPIRY_PREFIX}${mesaId}`);
        }
        setEsDueno(true);
        setCargando(false);
        return;
      }

      // Otra sesión activa → solo lectura
      if (mesa.token_sesion_actual) {
        setEsDueno(false);
        setCargando(false);
        return;
      }

      // Sin sesión activa → intentar reclamar con update atómico
      // PostgreSQL solo actualiza si token_sesion_actual sigue siendo NULL
      const nuevoToken = crypto.randomUUID();
      const { data: actualizada } = await supabase
        .from('mesas')
        .update({ token_sesion_actual: nuevoToken, token_creado_en: new Date().toISOString() })
        .eq('id_mesa', mesaId)
        .is('token_sesion_actual', null)
        .select('token_sesion_actual')
        .maybeSingle();

      if (actualizada?.token_sesion_actual === nuevoToken) {
        localStorage.setItem(`${STORAGE_PREFIX}${mesaId}`, nuevoToken);
        localStorage.setItem(`${STORAGE_EXPIRY_PREFIX}${mesaId}`, String(Date.now() + EXPIRY_MS));
        setEsDueno(true);
      } else {
        // Otro dispositivo ganó la carrera
        setEsDueno(false);
      }

      setCargando(false);
    };

    reclamarSesion();
  }, [mesaId]);

  // Vigilar expiración cada 30 segundos mientras se es dueño
  useEffect(() => {
    if (!mesaId) return;

    const verificar = async () => {
      if (!esDuenoRef.current) return;

      const expiry = localStorage.getItem(`${STORAGE_EXPIRY_PREFIX}${mesaId}`);
      if (!expiry) return; // Ya tiene pedido o no aplica

      if (Date.now() > parseInt(expiry)) {
        const tienePedido = await hayPedidoActivo(mesaId);
        if (tienePedido) {
          localStorage.removeItem(`${STORAGE_EXPIRY_PREFIX}${mesaId}`);
          return;
        }
        limpiarSesionLocal(mesaId);
        await supabase.from('mesas').update({ token_sesion_actual: null, token_creado_en: null }).eq('id_mesa', mesaId);
        setEsDueno(false);
        setSesionExpirada(true);
      }
    };

    const intervalo = setInterval(verificar, 30_000);
    return () => clearInterval(intervalo);
  }, [mesaId]);

  return { esDueno, cargando, numeroMesa, sesionExpirada };
};

export default useSesionMesa;
