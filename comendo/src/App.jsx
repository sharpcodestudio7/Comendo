// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MenuPage from './pages/MenuPage';
import OrderTrackingPage from './pages/OrderTrackingPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/mesa/:mesaId" element={<MenuPage />} />
        <Route path="/" element={<MenuPage />} />

        {/* Nueva ruta: recibe el id del pedido recién creado */}
        <Route path="/pedido/:pedidoId" element={<OrderTrackingPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;