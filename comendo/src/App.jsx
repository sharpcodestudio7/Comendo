// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'

// Páginas — las iremos llenando en cada rama
import MenuPage from './pages/MenuPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta raíz → vista del menú para el comensal */}
        <Route path="/" element={<MenuPage />} />
        
        {/* Aquí irán agregando rutas conforme avancen */}
        {/* <Route path="/cocina" element={<KDSPage />} /> */}
        {/* <Route path="/admin" element={<AdminPage />} /> */}
      </Routes>
    </BrowserRouter>
  )
}

export default App