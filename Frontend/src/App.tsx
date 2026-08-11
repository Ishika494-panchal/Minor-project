import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Products from './pages/Products';
import Challans from './pages/Challans';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Dashboard Route (All Authenticated Roles) */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected Customers Routes */}
          <Route
            path="/customers"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES']}>
                <Customers />
              </ProtectedRoute>
            }
          />

          <Route
            path="/customers/:id"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES']}>
                <CustomerDetail />
              </ProtectedRoute>
            }
          />

          {/* Protected Products Routes */}
          <Route
            path="/products"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS']}>
                <Products />
              </ProtectedRoute>
            }
          />

          {/* Protected Challans Routes */}
          <Route
            path="/challans"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS']}>
                <Challans />
              </ProtectedRoute>
            }
          />

          {/* Default Redirection */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
