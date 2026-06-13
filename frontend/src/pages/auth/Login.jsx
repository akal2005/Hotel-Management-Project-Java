import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      return toast.error('Please enter both email and password');
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      toast.success('Logged in successfully!');
      // Navigate to correct dashboard based on role
      // We will refresh user info from localStorage if needed, or let AuthContext handle
      // Let's defer redirect slightly to let AuthContext update state
      setTimeout(() => {
        const token = localStorage.getItem('token');
        if (token) {
          // Decode simple JWT to see role (or let profile fetch handle it)
          // We redirect based on the role fetched from the server.
          // Since AuthContext state user is updated, let's navigate:
          navigate('/');
        }
      }, 100);
    } else {
      toast.error(result.message || 'Invalid credentials');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          HotelMS <span>Pro</span>
        </div>
        <h3 style={{ textAlign: 'center', marginBottom: '24px', fontWeight: '500' }}>
          Sign In to Your Account
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '12px' }}
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          Don't have an account? <Link to="/register" style={{ fontWeight: '600' }}>Sign Up</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
