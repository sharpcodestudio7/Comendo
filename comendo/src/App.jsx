// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MenuPage from './pages/MenuPage';
import OrderTrackingPage from './pages/OrderTrackingPage';
import KDSPage from './pages/KDSPage';
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import ProtectedRoute from './components/ProtectedRoute';
import ProtectedKDS from './components/ProtectedKDS';
import MeseroPage from './pages/MeseroPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Módulo 1 — Comensal */}
        <Route path="/mesa/:mesaId" element={<MenuPage />} />
        <Route path="/" element={<MenuPage />} />
        <Route path="/pedido/:pedidoId" element={<OrderTrackingPage />} />

        {/* Módulo 2 — Cocina */}
        <Route path="/cocina" element={
          <ProtectedKDS>
            <KDSPage />
          </ProtectedKDS>
        } />

        {/* Módulo 4 — Mesero */}
        <Route path="/mesero" element={<MeseroPage />} />

        {/* Módulo 3 — Admin */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;