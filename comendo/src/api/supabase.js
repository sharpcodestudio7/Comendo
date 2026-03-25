import { createClient } from '@supabase/supabase-js';

// Traemos las variables de entorno que pusiste en el archivo .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Creamos y exportamos la conexión para poder usarla en cualquier parte de la app
export const supabase = createClient(supabaseUrl, supabaseAnonKey);