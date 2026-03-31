// src/hooks/useMenu.js
// Hook personalizado que obtiene categorías y productos desde Supabase.
// Maneja los estados de carga y error para la UI.

import { useState, useEffect } from 'react';
import { supabase } from '../api/supabase'; // ajusta la ruta si tu archivo tiene otro nombre

const useMenu = () => {
  const [categorias, setCategorias]   = useState([]);
  const [productos, setProductos]     = useState([]);
  const [cargando, setCargando]       = useState(true);
  const [error, setError]             = useState(null);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        setCargando(true);

        // Trae todas las categorías ordenadas por nombre
        const { data: cats, error: errorCats } = await supabase
          .from('categorias')
          .select('*')
          .order('nombre');

        if (errorCats) throw errorCats;

        // Trae solo productos disponibles, incluyendo el nombre de su categoría
        const { data: prods, error: errorProds } = await supabase
          .from('productos')
          .select(`
            *,
            categorias ( nombre )
          `)
          .eq('disponible', true)
          .order('nombre');

        if (errorProds) throw errorProds;

        setCategorias(cats);
        setProductos(prods);

      } catch (err) {
        setError(err.message);
      } finally {
        setCargando(false);
      }
    };

    fetchMenu();
  }, []);

  return { categorias, productos, cargando, error };
};

export default useMenu;