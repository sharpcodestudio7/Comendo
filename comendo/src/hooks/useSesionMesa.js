import { useState, useEffect } from 'react';
import { supabase } from '../api/supabase';

const STORAGE_PREFIX = 'comendo_session_';

const useSesionMesa = (mesaId) => {
  const [esDueno, setEsDueno] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!mesaId) {
      setCargando(false);
      return;
    }

    const reclamarSesion = async () => {
      const tokenLocal = localStorage.getItem(`${STORAGE_PREFIX}${mesaId}`);

      const { data: mesa } = await supabase
        .from('mesas')
        .select('token_sesion_actual')
        .eq('id_mesa', mesaId)
        .single();

      if (!mesa) {
        setCargando(false);
        return;
      }

      // Este dispositivo ya es dueño (mismo token en DB y localStorage)
      if (mesa.token_sesion_actual && tokenLocal === mesa.token_sesion_actual) {
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
        .update({ token_sesion_actual: nuevoToken })
        .eq('id_mesa', mesaId)
        .is('token_sesion_actual', null)
        .select('token_sesion_actual')
        .maybeSingle();

      if (actualizada?.token_sesion_actual === nuevoToken) {
        localStorage.setItem(`${STORAGE_PREFIX}${mesaId}`, nuevoToken);
        setEsDueno(true);
      } else {
        // Otro dispositivo ganó la carrera
        setEsDueno(false);
      }

      setCargando(false);
    };

    reclamarSesion();
  }, [mesaId]);

  return { esDueno, cargando };
};

export default useSesionMesa;
