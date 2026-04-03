// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MenuPage from './pages/MenuPage';
import OrderTrackingPage from './pages/OrderTrackingPage';
import KDSPage from './pages/KDSPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/mesa/:mesaId" element={<MenuPage />} />
        <Route path="/" element={<MenuPage />} />
        <Route path="/pedido/:pedidoId" element={<OrderTrackingPage />} />
        <Route path="/cocina" element={<KDSPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;