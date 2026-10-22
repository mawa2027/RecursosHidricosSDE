import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import Dashboard from '@/pages/Dashboard';
import PlantsPage from '@/pages/PlantsPage';
import PlantDetailPage from '@/pages/PlantDetailPage';
import UsersPage from '@/pages/UsersPage';
import ProfilePage from '@/pages/ProfilePage';
import MapPage from '@/pages/MapPage';
import AuditPage from '@/pages/AuditPage';
import NotFoundPage from '@/pages/NotFoundPage';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const { user, permisos } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (!permisos?.gestionarUsuarios) return <Navigate to="/dashboard" />;
  return children;
}

function AuditRoute({ children }) {
  const { user, permisos } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (!permisos?.verAuditoria) return <Navigate to="/dashboard" />;
  return children;
}

function App() {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/plantas" element={<PrivateRoute><PlantsPage /></PrivateRoute>} />
              <Route path="/plantas/:id" element={<PrivateRoute><PlantDetailPage /></PrivateRoute>} />
              <Route path="/perfil" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
              <Route path="/mapa" element={<PrivateRoute><MapPage /></PrivateRoute>} />
              <Route path="/usuarios" element={<AdminRoute><UsersPage /></AdminRoute>} />
              <Route path="/auditoria" element={<AuditRoute><AuditPage /></AuditRoute>} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
            <Toaster />
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;

