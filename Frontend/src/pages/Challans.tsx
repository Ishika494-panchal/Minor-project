import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface ChallanItem {
  id: string;
  productId: string;
  productNameSnap: string;
  skuSnap: string;
  unitPriceSnap: number;
  quantity: number;
}

interface Customer {
  id: string;
  name: string;
  mobile: string;
  businessName?: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  unitPrice: number;
  currentStock: number;
}

interface Challan {
  id: string;
  challanNumber: string;
  customerId: string;
  customer?: Customer;
  totalQuantity: number;
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
  createdById: string;
  createdAt: string;
  items: ChallanItem[];
}

export const Challans: React.FC = () => {
  const { user } = useAuth();
  const [challans, setChallans] = useState<Challan[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal: Create Challan
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [lineItems, setLineItems] = useState<{ productId: string; quantity: number }[]>([
    { productId: '', quantity: 1 },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Modal: View Details
  const [selectedChallan, setSelectedChallan] = useState<Challan | null>(null);

  const fetchChallans = async (status = '', pageNum = 1) => {
    setLoading(true);
    try {
      const response = await api.get(
        `/challans?status=${encodeURIComponent(status)}&page=${pageNum}&limit=10`
      );
      setChallans(response.items || []);
      setTotal(response.total || 0);
      setTotalPages(response.totalPages || 1);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const custRes = await api.get('/customers?limit=100');
      setCustomers(custRes.items || []);
      const prodRes = await api.get('/products?limit=100');
      setProducts(prodRes.items || []);
    } catch (err) {
      console.error('Error fetching customers/products for modal:', err);
    }
  };

  useEffect(() => {
    fetchChallans(statusFilter, page);
  }, [statusFilter, page]);

  const openCreateModal = () => {
    fetchDropdownData();
    setSelectedCustomerId('');
    setLineItems([{ productId: '', quantity: 1 }]);
    setModalError('');
    setShowCreateModal(true);
  };

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { productId: '', quantity: 1 }]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const handleLineChange = (index: number, field: 'productId' | 'quantity', value: any) => {
    const updated = [...lineItems];
    if (field === 'quantity') {
      updated[index].quantity = Math.max(1, parseInt(value, 10) || 1);
    } else {
      updated[index].productId = value;
    }
    setLineItems(updated);
  };

  const handleSaveChallan = async (targetStatus: 'DRAFT' | 'CONFIRMED') => {
    setModalError('');
    if (!selectedCustomerId) {
      setModalError('Please select a customer.');
      return;
    }

    const validItems = lineItems.filter((i) => i.productId && i.quantity > 0);
    if (validItems.length === 0) {
      setModalError('Please select at least one product with quantity > 0.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/challans', {
        customerId: selectedCustomerId,
        items: validItems,
        status: targetStatus,
      });
      setShowCreateModal(false);
      fetchChallans(statusFilter, page);
    } catch (err: any) {
      setModalError(err.message || 'Failed to create delivery challan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDraft = async (challanId: string) => {
    if (!window.confirm('Are you sure you want to CONFIRM this challan? Stock will be atomically deducted.')) return;
    try {
      await api.patch(`/challans/${challanId}/status`, { status: 'CONFIRMED' });
      fetchChallans(statusFilter, page);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleCancelDraft = async (challanId: string) => {
    if (!window.confirm('Are you sure you want to CANCEL this draft challan?')) return;
    try {
      await api.patch(`/challans/${challanId}/status`, { status: 'CANCELLED' });
      fetchChallans(statusFilter, page);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const role = user?.role || '';
  const canCreate = ['ADMIN', 'SALES'].includes(role);
  const canConfirm = ['ADMIN', 'SALES', 'WAREHOUSE'].includes(role);

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Delivery Challans</h1>
          <p className="page-subtitle">Dispatch documentation, atomic inventory lock & confirmation</p>
        </div>
        {canCreate && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            + Create New Challan
          </button>
        )}
      </div>

      <div className="card">
        <div className="card-header toolbar">
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Filter by Status:</label>
            <select
              className="form-control"
              style={{ width: '180px' }}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">DRAFT</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
          <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Showing <strong>{challans.length}</strong> of <strong>{total}</strong> challans
          </div>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Challan #</th>
                <th>Customer</th>
                <th>Total Qty</th>
                <th>Status</th>
                <th>Created By</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                    Loading delivery challans...
                  </td>
                </tr>
              ) : challans.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    No delivery challans found.
                  </td>
                </tr>
              ) : (
                challans.map((ch) => (
                  <tr key={ch.id}>
                    <td>
                      <span
                        style={{ fontWeight: 700, color: '#2563eb', cursor: 'pointer' }}
                        onClick={() => setSelectedChallan(ch)}
                      >
                        {ch.challanNumber}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{ch.customer?.name || 'Customer ID: ' + ch.customerId}</div>
                      {ch.customer?.businessName && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{ch.customer.businessName}</div>
                      )}
                    </td>
                    <td>
                      <strong>{ch.totalQuantity}</strong> items ({ch.items.length} lines)
                    </td>
                    <td>
                      <span className={`badge badge-${ch.status}`}>{ch.status}</span>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{ch.createdById}</td>
                    <td>{new Date(ch.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedChallan(ch)}
                        >
                          View
                        </button>
                        {ch.status === 'DRAFT' && canConfirm && (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleConfirmDraft(ch.id)}
                          >
                            Confirm
                          </button>
                        )}
                        {ch.status === 'DRAFT' && canCreate && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleCancelDraft(ch.id)}
                          >
                            Cancel
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

      {/* Modal: Create Challan */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Create Delivery Challan</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              {modalError && <div className="alert alert-danger">{modalError}</div>}

              <div className="form-group">
                <label className="form-label">Select Customer *</label>
                <select
                  className="form-control"
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.businessName ? `(${c.businessName})` : ''} - {c.mobile}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Challan Line Items</h4>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddLineItem}>
                    + Add Product Line
                  </button>
                </div>

                {lineItems.map((item, idx) => {
                  const selProd = products.find((p) => p.id === item.productId);
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 120px 40px',
                        gap: '0.75rem',
                        marginBottom: '0.75rem',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <select
                          className="form-control"
                          value={item.productId}
                          onChange={(e) => handleLineChange(idx, 'productId', e.target.value)}
                        >
                          <option value="">-- Select Product --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (SKU: {p.sku}) | Stock: {p.currentStock}
                            </option>
                          ))}
                        </select>
                        {selProd && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                            Price: ₹{Number(selProd.unitPrice).toFixed(2)} | Avail Stock: {selProd.currentStock}
                          </div>
                        )}
                      </div>

                      <div>
                        <input
                          type="number"
                          min="1"
                          className="form-control"
                          value={item.quantity}
                          onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)}
                        />
                      </div>

                      <div>
                        {lineItems.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleRemoveLineItem(idx)}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={submitting}
                onClick={() => handleSaveChallan('DRAFT')}
              >
                Save as Draft
              </button>
              <button
                type="button"
                className="btn btn-success"
                disabled={submitting}
                onClick={() => handleSaveChallan('CONFIRMED')}
              >
                Save & Confirm (Lock Stock)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: View Details */}
      {selectedChallan && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Challan Details: {selectedChallan.challanNumber}</h3>
              <button className="modal-close" onClick={() => setSelectedChallan(null)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row" style={{ marginBottom: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Challan Status</div>
                  <span className={`badge badge-${selectedChallan.status}`} style={{ fontSize: '0.9rem', marginTop: '0.2rem' }}>
                    {selectedChallan.status}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Customer Name</div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                    {selectedChallan.customer?.name || selectedChallan.customerId}
                  </div>
                  {selectedChallan.customer?.businessName && (
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{selectedChallan.customer.businessName}</div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Total Items Qty</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#2563eb' }}>
                    {selectedChallan.totalQuantity} units
                  </div>
                </div>
              </div>

              <div className="form-row" style={{ marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Created By User</div>
                  <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{selectedChallan.createdById}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Created Date & Time</div>
                  <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>
                    {new Date(selectedChallan.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>

              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', marginTop: '1.25rem' }}>
                Itemized Catalog Snapshots
              </h4>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>SKU</th>
                      <th>Unit Price Snap</th>
                      <th>Qty</th>
                      <th>Line Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedChallan.items.map((item) => {
                      const subtotal = Number(item.unitPriceSnap) * item.quantity;
                      return (
                        <tr key={item.id}>
                          <td style={{ fontWeight: 500 }}>{item.productNameSnap}</td>
                          <td>
                            <code style={{ background: '#e2e8f0', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>
                              {item.skuSnap}
                            </code>
                          </td>
                          <td>₹{Number(item.unitPriceSnap).toFixed(2)}</td>
                          <td>
                            <strong>{item.quantity}</strong>
                          </td>
                          <td>
                            <strong>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedChallan(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Challans;
