import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    customersCount: 0,
    productsCount: 0,
    challansCount: 0,
    lowStockCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      setLoading(true);
      try {
        const [custRes, prodRes, chalRes] = await Promise.allSettled([
          api.get('/customers?limit=1'),
          api.get('/products?limit=100'),
          api.get('/challans?limit=1'),
        ]);

        const customersCount = custRes.status === 'fulfilled' ? custRes.value.total || 0 : 0;
        const challansCount = chalRes.status === 'fulfilled' ? chalRes.value.total || 0 : 0;

        let productsCount = 0;
        let lowStockCount = 0;

        if (prodRes.status === 'fulfilled') {
          productsCount = prodRes.value.total || 0;
          const items = prodRes.value.items || [];
          lowStockCount = items.filter(
            (p: any) => p.currentStock <= p.minStockAlert
          ).length;
        }

        setStats({
          customersCount,
          productsCount,
          challansCount,
          lowStockCount,
        });
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {user?.name}!</h1>
          <p className="page-subtitle">
            Role: <span className={`badge badge-${user?.role}`}>{user?.role}</span> • Wholesale Operations & CRM Overview
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        <div className="card" style={{ padding: '1.5rem', marginBottom: 0 }}>
          <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
            TOTAL CUSTOMERS
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#2563eb', marginTop: '0.25rem' }}>
            {loading ? '...' : stats.customersCount}
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            {['ADMIN', 'SALES'].includes(user?.role || '') && (
              <Link to="/customers" style={{ fontSize: '0.8rem', color: '#2563eb', textDecoration: 'none' }}>
                View CRM Directory
              </Link>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem', marginBottom: 0 }}>
          <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
            CATALOG PRODUCTS
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>
            {loading ? '...' : stats.productsCount}
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <Link to="/products" style={{ fontSize: '0.8rem', color: '#2563eb', textDecoration: 'none' }}>
              View Inventory
            </Link>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem', marginBottom: 0 }}>
          <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
            TOTAL DELIVERY CHALLANS
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981', marginTop: '0.25rem' }}>
            {loading ? '...' : stats.challansCount}
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <Link to="/challans" style={{ fontSize: '0.8rem', color: '#2563eb', textDecoration: 'none' }}>
              View Challan Logs
            </Link>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem', marginBottom: 0 }}>
          <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
            LOW STOCK ALERTS
          </div>
          <div
            style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: stats.lowStockCount > 0 ? '#ef4444' : '#10b981',
              marginTop: '0.25rem',
            }}
          >
            {loading ? '...' : stats.lowStockCount}
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <Link to="/products" style={{ fontSize: '0.8rem', color: '#ef4444', textDecoration: 'none' }}>
              Review Alerts
            </Link>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Quick Action Modules</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {['ADMIN', 'SALES'].includes(user?.role || '') && (
              <Link to="/customers" className="btn btn-primary">
                Customer Accounts & Follow-ups
              </Link>
            )}
            {['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'].includes(user?.role || '') && (
              <Link to="/products" className="btn btn-secondary">
                Products & Stock Management
              </Link>
            )}
            {['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'].includes(user?.role || '') && (
              <Link to="/challans" className="btn btn-secondary">
                Delivery Challans & Dispatch
              </Link>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
