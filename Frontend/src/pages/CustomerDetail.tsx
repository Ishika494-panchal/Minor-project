import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface FollowUp {
  id: string;
  note: string;
  date: string;
  createdById: string;
}

interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  businessName?: string;
  gstNumber?: string;
  customerType: string;
  address?: string;
  status: string;
  followUpDate?: string;
  notes?: string;
  createdAt: string;
  followUps: FollowUp[];
  challans?: any[];
}

export const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [note, setNote] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [noteError, setNoteError] = useState('');

  // Edit Customer Modal State
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

  const fetchCustomerDetails = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get(`/customers/${id}`);
      setCustomer(res.customer);
    } catch (err: any) {
      setError(err.message || 'Failed to load customer details');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = () => {
    if (!customer) return;
    setEditFormData({
      name: customer.name || '',
      mobile: customer.mobile || '',
      email: customer.email || '',
      businessName: customer.businessName || '',
      gstNumber: customer.gstNumber || '',
      customerType: customer.customerType || 'WHOLESALE',
      address: customer.address || '',
      status: customer.status || 'ACTIVE',
      notes: customer.notes || '',
    });
    setEditError('');
    setShowEditModal(true);
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setEditSubmitting(true);
    setEditError('');

    try {
      await api.put(`/customers/${id}`, editFormData);
      setShowEditModal(false);
      fetchCustomerDetails();
    } catch (err: any) {
      setEditError(err.message || 'Failed to update customer');
    } finally {
      setEditSubmitting(false);
    }
  };

  useEffect(() => {
    fetchCustomerDetails();
  }, [id]);

  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !note.trim()) return;

    setAddingNote(true);
    setNoteError('');
    try {
      await api.post(`/customers/${id}/followup`, {
        note,
        date: nextFollowUpDate || undefined,
      });
      setNote('');
      setNextFollowUpDate('');
      fetchCustomerDetails();
    } catch (err: any) {
      setNoteError(err.message || 'Failed to add follow-up note');
    } finally {
      setAddingNote(false);
    }
  };

  const canAddFollowUp = ['ADMIN', 'SALES'].includes(user?.role || '');

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '3rem', textAlign: 'center' }}>Loading customer profile...</div>
      </Layout>
    );
  }

  if (error || !customer) {
    return (
      <Layout>
        <div className="alert alert-danger">{error || 'Customer not found'}</div>
        <Link to="/customers" className="btn btn-secondary">
          ← Back to Customers
        </Link>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <Link to="/customers" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.875rem' }}>
            Back to Customers
          </Link>
          <h1 className="page-title" style={{ marginTop: '0.5rem' }}>
            {customer.name}
          </h1>
          <p className="page-subtitle">
            {customer.businessName ? `${customer.businessName} • ` : ''}
            Type: <span className={`badge badge-${customer.customerType}`}>{customer.customerType}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span className={`badge badge-${customer.status}`} style={{ fontSize: '0.9rem', padding: '0.4rem 1rem' }}>
            {customer.status}
          </span>
          {canAddFollowUp && (
            <button className="btn btn-outline btn-sm" onClick={openEditModal}>
              Edit Customer
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>
        {/* Main Details & Follow-up History */}
        <div>
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title">Customer Information</h3>
              {canAddFollowUp && (
                <button className="btn btn-secondary btn-sm" onClick={openEditModal}>
                  Edit Profile
                </button>
              )}
            </div>
            <div className="card-body">
              <div className="form-row" style={{ marginBottom: '1rem' }}>
                <div>
                  <label className="form-label" style={{ color: '#64748b' }}>Mobile Number</label>
                  <p style={{ fontWeight: 600 }}>{customer.mobile}</p>
                </div>
                <div>
                  <label className="form-label" style={{ color: '#64748b' }}>Email Address</label>
                  <p style={{ fontWeight: 600 }}>{customer.email || '—'}</p>
                </div>
              </div>

              <div className="form-row" style={{ marginBottom: '1rem' }}>
                <div>
                  <label className="form-label" style={{ color: '#64748b' }}>GST Number</label>
                  <p style={{ fontWeight: 600 }}>{customer.gstNumber || '—'}</p>
                </div>
                <div>
                  <label className="form-label" style={{ color: '#64748b' }}>Next Scheduled Follow-up</label>
                  <p style={{ fontWeight: 600, color: customer.followUpDate ? '#2563eb' : '#64748b' }}>
                    {customer.followUpDate
                      ? new Date(customer.followUpDate).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'None set'}
                  </p>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: '#64748b' }}>Address</label>
                <p style={{ fontWeight: 500 }}>{customer.address || '—'}</p>
              </div>

              {customer.notes && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#64748b' }}>General Notes</label>
                  <p style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', fontSize: '0.875rem' }}>
                    {customer.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Follow-up Timeline */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Follow-up Activity Log ({customer.followUps.length})</h3>
            </div>
            <div className="card-body">
              {customer.followUps.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No follow-up activity logged yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {customer.followUps.map((f) => (
                    <div
                      key={f.id}
                      style={{
                        padding: '1rem',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px',
                        borderLeft: '4px solid #3b82f6',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                          By User: {f.createdById}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {new Date(f.date).toLocaleString()}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.9rem', color: '#0f172a' }}>{f.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Add Follow-Up Form */}
        <div>
          {canAddFollowUp && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Add Follow-up Note</h3>
              </div>
              <form onSubmit={handleAddFollowUp}>
                <div className="card-body">
                  {noteError && <div className="alert alert-danger">{noteError}</div>}

                  <div className="form-group">
                    <label className="form-label">Activity / Discussion Note *</label>
                    <textarea
                      className="form-control"
                      rows={4}
                      placeholder="e.g. Spoke with purchasing head. Promised quotation by Friday."
                      required
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Set Next Follow-up Date (Optional)</label>
                    <input
                      type="date"
                      className="form-control"
                      value={nextFollowUpDate}
                      onChange={(e) => setNextFollowUpDate(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    disabled={addingNote}
                  >
                    {addingNote ? 'Saving Note...' : 'Log Follow-up'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Quick Challans Overview */}
          {customer.challans && customer.challans.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Recent Delivery Challans</h3>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <ul style={{ listStyle: 'none' }}>
                  {customer.challans.map((ch) => (
                    <li
                      key={ch.id}
                      style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{ch.challanNumber}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Qty: {ch.totalQuantity} items</div>
                      </div>
                      <span className={`badge badge-${ch.status}`}>{ch.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal for Editing Customer Details */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Edit Customer Profile</h3>
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
                  {editSubmitting ? 'Saving Changes...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default CustomerDetail;
