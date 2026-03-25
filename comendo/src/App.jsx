import { useEffect, useState } from 'react'
import { supabase } from './api/supabase' // Importamos tu conexión

function App() {
  const [categorias, setCategorias] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    // Función para pedirle los datos a Supabase
    async function obtenerCategorias() {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')

      if (error) {
        console.error("Error al conectar:", error)
      } else {
        setCategorias(data)
      }
      setCargando(false)
    }

    obtenerCategorias()
  }, [])

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>🚀 Conexión Exitosa a Comendo</h1>
      <p>Si ves las categorías abajo, ¡tu base de datos funciona perfectamente!</p>
      
      {cargando ? (
        <p>Cargando datos desde Supabase...</p>
      ) : (
        <ul style={{ fontSize: '20px', backgroundColor: '#f0f0f0', padding: '20px', borderRadius: '8px' }}>
          {categorias.map((cat) => (
            <li key={cat.id_categoria} style={{ margin: '10px 0' }}>
              🍔 {cat.nombre}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default App