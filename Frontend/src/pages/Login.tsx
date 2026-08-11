import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response: any = await api.post('/auth/login', { email, password });
      const token = response?.token || response?.data?.token || response?.result?.token;
      const user = response?.user || response?.data?.user || response?.result?.user;

      if (token && user) {
        login(token, user);
        navigate('/dashboard', { replace: true });
      } else {
        console.error('Unexpected login response:', response);
        setError(
          response?.message || 'Invalid response format from server (missing token or user).'
        );
      }
    } catch (err: any) {
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        setError('Cannot connect to backend server. Please ensure Backend is running on http://localhost:5000.');
      } else {
        setError(err.message || 'Login failed. Please check credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fillQuickRole = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('Password123');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        padding: '1rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '2.5rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
            Mini ERP System
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Operations & Management Portal
          </p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="user@minierp.com"
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
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.75rem' }}>
            QUICK LOGIN ACCOUNTS:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fillQuickRole('admin@minierp.com')}
            >
              Admin
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fillQuickRole('sales@minierp.com')}
            >
              Sales
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fillQuickRole('warehouse@minierp.com')}
            >
              Warehouse
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fillQuickRole('accounts@minierp.com')}
            >
              Accounts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
