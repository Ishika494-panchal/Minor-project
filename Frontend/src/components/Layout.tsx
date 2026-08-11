import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const role = (user?.role || '').toUpperCase();
  const canSeeCustomers = ['ADMIN', 'SALES'].includes(role);
  const canSeeProducts = ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'].includes(role);
  const canSeeChallans = ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'].includes(role);

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span>Mini ERP System</span>
        </div>

        <ul className="sidebar-nav">
          <li className="sidebar-nav-item">
            <NavLink
              to="/dashboard"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              Dashboard
            </NavLink>
          </li>
          {canSeeCustomers && (
            <li className="sidebar-nav-item">
              <NavLink
                to="/customers"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                Customers
              </NavLink>
            </li>
          )}
          {canSeeProducts && (
            <li className="sidebar-nav-item">
              <NavLink
                to="/products"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                Products
              </NavLink>
            </li>
          )}
          {canSeeChallans && (
            <li className="sidebar-nav-item">
              <NavLink
                to="/challans"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                Challans
              </NavLink>
            </li>
          )}
        </ul>

        <div className="sidebar-footer">
          <div className="user-badge">
            <div className="user-info">
              <span className="user-name">{user?.name || user?.email}</span>
              <span className={`role-pill role-${role}`}>{role}</span>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleLogout} style={{ width: '100%' }}>
            Logout
          </button>
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <span className="topbar-title">Operations Portal</span>
          <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Logged in as <strong>{user?.email}</strong>
          </div>
        </header>
        <main className="page-wrapper">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
