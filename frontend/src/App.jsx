import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Dashboards
import AdminDashboard from './pages/admin/AdminDashboard';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import ReceptionistDashboard from './pages/receptionist/ReceptionistDashboard';
import CustomerPortal from './pages/customer/CustomerPortal';
import HousekeeperBoard from './pages/housekeeper/HousekeeperBoard';

// Root gate router helper
const HomeRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  switch (user.role_name) {
    case 'admin':
      return <Navigate to="/admin/users" replace />;
    case 'manager':
      return <Navigate to="/manager" replace />;
    case 'receptionist':
      return <Navigate to="/reception" replace />;
    case 'housekeeper':
      return <Navigate to="/housekeep" replace />;
    case 'customer':
      return <Navigate to="/customer" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

const App = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Default role redirection gate */}
            <Route path="/" element={<HomeRedirect />} />

            {/* Admin Panel */}
            <Route path="/admin/*" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DashboardLayout>
                  <Routes>
                    <Route path="/users" element={<AdminDashboard />} />
                    <Route path="/hotels" element={<AdminDashboard />} />
                    <Route path="/logs" element={<AdminDashboard />} />
                    <Route path="*" element={<Navigate to="/admin/users" replace />} />
                  </Routes>
                </DashboardLayout>
              </ProtectedRoute>
            } />

            {/* Manager Panel */}
            <Route path="/manager/*" element={
              <ProtectedRoute allowedRoles={['manager']}>
                <DashboardLayout>
                  <Routes>
                    <Route path="/" element={<ManagerDashboard />} />
                    <Route path="/rooms" element={<ManagerDashboard />} />
                    <Route path="/complaints" element={<ManagerDashboard />} />
                    <Route path="*" element={<Navigate to="/manager" replace />} />
                  </Routes>
                </DashboardLayout>
              </ProtectedRoute>
            } />

            {/* Receptionist Panel */}
            <Route path="/reception/*" element={
              <ProtectedRoute allowedRoles={['receptionist']}>
                <DashboardLayout>
                  <Routes>
                    <Route path="/" element={<ReceptionistDashboard />} />
                    <Route path="/walk-in" element={<ReceptionistDashboard />} />
                    <Route path="/payments" element={<ReceptionistDashboard />} />
                    <Route path="*" element={<Navigate to="/reception" replace />} />
                  </Routes>
                </DashboardLayout>
              </ProtectedRoute>
            } />

            {/* Housekeeper Board */}
            <Route path="/housekeep" element={
              <ProtectedRoute allowedRoles={['housekeeper']}>
                <DashboardLayout>
                  <HousekeeperBoard />
                </DashboardLayout>
              </ProtectedRoute>
            } />

            {/* Customer Portal */}
            <Route path="/customer/*" element={
              <ProtectedRoute allowedRoles={['customer']}>
                <DashboardLayout>
                  <Routes>
                    <Route path="/" element={<CustomerPortal />} />
                    <Route path="/bookings" element={<CustomerPortal />} />
                    <Route path="/complaints" element={<CustomerPortal />} />
                    <Route path="*" element={<Navigate to="/customer" replace />} />
                  </Routes>
                </DashboardLayout>
              </ProtectedRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
};

export default App;
