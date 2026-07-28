import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import MfaEnroll from './pages/MfaEnroll';
import MfaChallenge from './pages/MfaChallenge';
import Dashboard from './pages/Dashboard';
import Categories from './pages/Categories';
import Resources from './pages/Resources';
import Consumption from './pages/Consumption';
import Reports from './pages/Reports';
import AdminUsers from './pages/AdminUsers';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ style: { fontSize: '14px' } }} />
        <Routes>
          <Route path="/connexion" element={<Login />} />
          <Route path="/mfa/configuration" element={<MfaEnroll />} />
          <Route path="/mfa/verification" element={<MfaChallenge />} />

          <Route path="/tableau-de-bord" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/categories" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
          <Route path="/ressources" element={<ProtectedRoute><Resources /></ProtectedRoute>} />
          <Route path="/consommation" element={<ProtectedRoute><Consumption /></ProtectedRoute>} />
          <Route path="/rapports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route
            path="/administration"
            element={
              <ProtectedRoute adminOnly>
                <AdminUsers />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/tableau-de-bord" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
