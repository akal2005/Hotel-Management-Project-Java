import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#0b0f19',
        color: '#f59e0b',
        fontFamily: 'sans-serif',
        fontSize: '18px'
      }}>
        Loading HotelMS Pro...
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role_name)) {
    // Redirect to home dashboard based on their role
    switch (user.role_name) {
      case 'admin':
        return <Navigate to="/admin" replace />;
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
  }

  return children;
};

export default ProtectedRoute;
