import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  // Define sidebar links dynamically based on role
  const getLinks = () => {
    switch (user.role_name) {
      case 'admin':
        return [
          { name: 'User Management', path: '/admin/users' },
          { name: 'Hotel Settings', path: '/admin/hotels' },
          { name: 'System Logs', path: '/admin/logs' },
        ];
      case 'manager':
        return [
          { name: 'Overview Stats', path: '/manager' },
          { name: 'Room Inventory', path: '/manager/rooms' },
          { name: 'Complaints Register', path: '/manager/complaints' },
        ];
      case 'receptionist':
        return [
          { name: 'Walk-in booking', path: '/reception/walk-in' },
          { name: 'Check-in/out Panel', path: '/reception' },
          { name: 'Payments Logs', path: '/reception/payments' },
        ];
      case 'customer':
        return [
          { name: 'Room Catalog', path: '/customer' },
          { name: 'My Bookings', path: '/customer/bookings' },
          { name: 'Support Tickets', path: '/customer/complaints' },
        ];
      case 'housekeeper':
        return [
          { name: 'Cleaning Schedule', path: '/housekeep' },
        ];
      default:
        return [];
    }
  };

  const links = getLinks();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardHome = () => {
    switch (user.role_name) {
      case 'admin': return '/admin/users';
      case 'manager': return '/manager';
      case 'receptionist': return '/reception';
      case 'customer': return '/customer';
      case 'housekeeper': return '/housekeep';
      default: return '/login';
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand" onClick={() => navigate(getDashboardHome())} style={{ cursor: 'pointer' }}>
          HotelMS <span>Pro</span>
        </div>
        <ul className="sidebar-menu">
          {links.map((link) => (
            <li key={link.path}>
              <div
                className={`sidebar-link ${location.pathname === link.path ? 'active' : ''}`}
                onClick={() => navigate(link.path)}
              >
                <span>{link.name}</span>
              </div>
            </li>
          ))}
        </ul>
        <div className="sidebar-footer">
          <div className="user-badge">
            <div className="user-avatar">
              {user.first_name[0].toUpperCase()}
            </div>
            <div className="user-info">
              <span className="user-name">{user.first_name} {user.last_name}</span>
              <span className="user-role">{user.role_name}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              color: '#ef4444',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '12px',
              textTransform: 'uppercase'
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main panel */}
      <main className="main-panel">
        <header className="main-header">
          <div className="header-title">
            <h3>{user.role_name.toUpperCase()} PANEL</h3>
          </div>
          <div className="header-actions">
            <span>Welcome, {user.first_name}!</span>
          </div>
        </header>
        <div className="main-content">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
