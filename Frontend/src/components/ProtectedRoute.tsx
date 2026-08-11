import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuth();

  const savedToken = sessionStorage.getItem('token') || localStorage.getItem('token');
  const savedUserRaw = sessionStorage.getItem('user') || localStorage.getItem('user');
  const savedUser = savedUserRaw ? JSON.parse(savedUserRaw) : null;

  const currentUser = user || savedUser;

  if (!isAuthenticated && !savedToken) {
    return <Navigate to="/login" replace />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <h2>403 - Restricted Module</h2>
        <p style={{ marginTop: '0.5rem', color: '#64748b' }}>
          Your account role (<strong>{currentUser.role}</strong>) does not have access to this page.
        </p>
        <div style={{ marginTop: '1.5rem' }}>
          <a href="/dashboard" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
            ← Return to Operations Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
