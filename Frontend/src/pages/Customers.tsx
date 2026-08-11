import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  businessName?: string;
  gstNumber?: string;
  customerType: 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR';
  address?: string;
  status: 'LEAD' | 'ACTIVE' | 'INACTIVE';
  followUpDate?: string;
  createdAt: string;
}

export const Customers: React.FC = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    businessName: '',
    gstNumber: '',
    customerType: 'WHOLESALE',
    address: '',
    status: 'ACTIVE',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Edit Customer State
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    businessName: '',
    gstNumber: '',
    customerType: 'WHOLESALE',
    address: '',
    status: 'ACTIVE',
    notes: '',
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  const fetchCustomers = async (searchQuery = '', pageNum = 1) => {
    setLoading(true);
    try {
      const response = await api.get(
        `/customers?search=${encodeURIComponent(searchQuery)}&page=${pageNum}&limit=10`
      );
      setCustomers(response.items || []);
      setTotal(response.total || 0);
      setTotalPages(response.totalPages || 1);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(search, page);
  }, [page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers(search, 1);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await api.post('/customers', formData);
      setShowModal(false);
      setFormData({
        name: '',
        mobile: '',
        email: '',
        businessName: '',
        gstNumber: '',
        customerType: 'WHOLESALE',
        address: '',
        status: 'ACTIVE',
        notes: '',
      });
      fetchCustomers(search, page);
    } catch (err: any) {
      setError(err.message || 'Failed to create customer');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setEditFormData({
      name: c.name || '',
      mobile: c.mobile || '',
      email: c.email || '',
      businessName: c.businessName || '',
      gstNumber: c.gstNumber || '',
      customerType: c.customerType || 'WHOLESALE',
      address: c.address || '',
      status: c.status || 'ACTIVE',
      notes: '',
    });
    setEditError('');
    setShowEditModal(true);
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    setEditSubmitting(true);
    setEditError('');

    try {
      await api.put(`/customers/${editingCustomer.id}`, editFormData);
      setShowEditModal(false);
      setEditingCustomer(null);
      fetchCustomers(search, page);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update customer');
    } finally {
      setEditSubmitting(false);
    }
  };

  const canEdit = ['ADMIN', 'SALES'].includes(user?.role || '');

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers & CRM</h1>
          <p className="page-subtitle">Manage wholesale leads, active accounts & follow-up schedules</p>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Add New Customer
          </button>
        )}
      </div>

      <div className="card">
        <div className="card-header toolbar">
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              className="search-input"
              placeholder="Search by name, mobile, email, business..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="btn btn-secondary">
              Search
            </button>
          </form>
          <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Showing <strong>{customers.length}</strong> of <strong>{total}</strong> customers
          </div>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Business Name</th>
                <th>Contact info</th>
                <th>Type</th>
                <th>Status</th>
                <th>Follow-up</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                    Loading customers...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    No customers found matching search criteria.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/customers/${c.id}`} style={{ fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}>
                        {c.name}
                      </Link>
                    </td>
                    <td>{c.businessName || '—'}</td>
                    <td>
                      <div>{c.mobile}</div>
                      {c.email && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{c.email}</div>}
                    </td>
                    <td>
                      <span className={`badge badge-${c.customerType}`}>{c.customerType}</span>
                    </td>
                    <td>
                      <span className={`badge badge-${c.status}`}>{c.status}</span>
                    </td>
                    <td>
                      {c.followUpDate
                        ? new Date(c.followUpDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'None'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <Link to={`/customers/${c.id}`} className="btn btn-secondary btn-sm">
                          View Profile
                        </Link>
                        {canEdit && (
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => openEditModal(c)}
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <span className="pagination-info">
            Page {page} of {totalPages}
          </span>
          <div className="pagination-controls">
            <button
              className="btn btn-secondary btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Modal for Creating Customer */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Add New Customer</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateCustomer}>
              <div className="modal-body">
                {error && <div className="alert alert-danger">{error}</div>}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mobile Number *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      className="form-control"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Business Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Customer Type</label>
                    <select
                      className="form-control"
                      value={formData.customerType}
                      onChange={(e) =>
                        setFormData({ ...formData, customerType: e.target.value as any })
                      }
                    >
                      <option value="RETAIL">RETAIL</option>
                      <option value="WHOLESALE">WHOLESALE</option>
                      <option value="DISTRIBUTOR">DISTRIBUTOR</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      className="form-control"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    >
                      <option value="LEAD">LEAD</option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">GST Number</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="27AAAAA0000A1Z5"
                    value={formData.gstNumber}
                    onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Address</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Editing Customer */}
      {showEditModal && editingCustomer && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Edit Customer Details</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleUpdateCustomer}>
              <div className="modal-body">
                {editError && <div className="alert alert-danger">{editError}</div>}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mobile Number *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={editFormData.mobile}
                      onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      className="form-control"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Business Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editFormData.businessName}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, businessName: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Customer Type</label>
                    <select
                      className="form-control"
                      value={editFormData.customerType}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, customerType: e.target.value as any })
                      }
                    >
                      <option value="RETAIL">RETAIL</option>
                      <option value="WHOLESALE">WHOLESALE</option>
                      <option value="DISTRIBUTOR">DISTRIBUTOR</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      className="form-control"
                      value={editFormData.status}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, status: e.target.value as any })
                      }
                    >
                      <option value="LEAD">LEAD</option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">GST Number</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="27AAAAA0000A1Z5"
                    value={editFormData.gstNumber}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, gstNumber: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Address</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={editFormData.address}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, address: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={editSubmitting}>
                  {editSubmitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Customers;
