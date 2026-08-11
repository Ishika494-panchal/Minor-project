import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: number | string;
  currentStock: number;
  minStockAlert: number;
  location?: string;
  createdAt: string;
}

interface StockLog {
  id: string;
  productId: string;
  quantity: number;
  type: 'IN' | 'OUT';
  reason?: string;
  createdById: string;
  createdAt: string;
  product?: {
    name: string;
    sku: string;
  };
}

export const Products: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Add Product Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    category: 'General',
    unitPrice: 0,
    currentStock: 0,
    minStockAlert: 10,
    location: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Edit Product Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editProductForm, setEditProductForm] = useState({
    name: '',
    sku: '',
    category: 'General',
    unitPrice: 0,
    currentStock: 0,
    minStockAlert: 10,
    location: '',
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editFormError, setEditFormError] = useState('');

  // Stock Movement Modal
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockForm, setStockForm] = useState({
    quantity: 1,
    type: 'IN' as 'IN' | 'OUT',
    reason: '',
  });
  const [stockSubmitting, setStockSubmitting] = useState(false);
  const [stockError, setStockError] = useState('');

  // Stock Logs Modal
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [logsFilterProduct, setLogsFilterProduct] = useState<Product | null>(null);
  const [stockLogs, setStockLogs] = useState<StockLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchProducts = async (searchQuery = '', pageNum = 1) => {
    setLoading(true);
    try {
      const response = await api.get(
        `/products?search=${encodeURIComponent(searchQuery)}&page=${pageNum}&limit=10`
      );
      setProducts(response.items || []);
      setTotal(response.total || 0);
      setTotalPages(response.totalPages || 1);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(search, page);
  }, [page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts(search, 1);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      await api.post('/products', {
        ...productForm,
        unitPrice: Number(productForm.unitPrice),
        currentStock: Number(productForm.currentStock),
        minStockAlert: Number(productForm.minStockAlert),
      });
      setShowAddModal(false);
      setProductForm({
        name: '',
        sku: '',
        category: 'General',
        unitPrice: 0,
        currentStock: 0,
        minStockAlert: 10,
        location: '',
      });
      fetchProducts(search, page);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setEditProductForm({
      name: product.name || '',
      sku: product.sku || '',
      category: product.category || 'General',
      unitPrice: Number(product.unitPrice) || 0,
      currentStock: product.currentStock || 0,
      minStockAlert: product.minStockAlert || 10,
      location: product.location || '',
    });
    setEditFormError('');
    setShowEditModal(true);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setEditSubmitting(true);
    setEditFormError('');

    try {
      await api.put(`/products/${editingProduct.id}`, {
        ...editProductForm,
        unitPrice: Number(editProductForm.unitPrice),
        currentStock: Number(editProductForm.currentStock),
        minStockAlert: Number(editProductForm.minStockAlert),
      });
      setShowEditModal(false);
      setEditingProduct(null);
      fetchProducts(search, page);
    } catch (err: any) {
      setEditFormError(err.message || 'Failed to update product');
    } finally {
      setEditSubmitting(false);
    }
  };

  const openLogsModal = async (product?: Product) => {
    setLogsFilterProduct(product || null);
    setShowLogsModal(true);
    setLogsLoading(true);
    try {
      const url = product
        ? `/products/stock-movements?productId=${product.id}&limit=50`
        : `/products/stock-movements?limit=50`;
      const res = await api.get(url);
      setStockLogs(res.items || []);
    } catch (err) {
      console.error('Failed to load stock movement logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  const openStockModal = (product: Product) => {
    setSelectedProduct(product);
    setStockForm({ quantity: 1, type: 'IN', reason: '' });
    setStockError('');
    setShowStockModal(true);
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setStockSubmitting(true);
    setStockError('');

    try {
      await api.post(`/products/${selectedProduct.id}/stock`, {
        quantity: Number(stockForm.quantity),
        type: stockForm.type,
        reason: stockForm.reason || undefined,
      });
      setShowStockModal(false);
      fetchProducts(search, page);
    } catch (err: any) {
      setStockError(err.message || 'Stock adjustment failed');
    } finally {
      setStockSubmitting(false);
    }
  };

  const canManageProducts = ['ADMIN', 'WAREHOUSE'].includes(user?.role || '');

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory & Products</h1>
          <p className="page-subtitle">Manage wholesale catalog, stock levels, and bin locations</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={() => openLogsModal()}>
            All Stock Logs
          </button>
          {canManageProducts && (
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              + Add New Product
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header toolbar">
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              className="search-input"
              placeholder="Search by product name, SKU, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="btn btn-secondary">
              Search
            </button>
          </form>
          <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Showing <strong>{products.length}</strong> of <strong>{total}</strong> products
          </div>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Unit Price (₹)</th>
                <th>Current Stock</th>
                <th>Min Alert</th>
                <th>Location</th>
                <th>Created Date / Timestamp</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>
                    Loading inventory catalog...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    No products found matching query.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isLowStock = p.currentStock <= p.minStockAlert;
                  return (
                    <tr key={p.id} className={isLowStock ? 'row-low-stock' : ''}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                      </td>
                      <td>
                        <code style={{ background: '#e2e8f0', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                          {p.sku}
                        </code>
                      </td>
                      <td>{p.category}</td>
                      <td>₹{Number(p.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td>
                        <span
                          style={{
                            fontWeight: 700,
                            color: isLowStock ? '#dc2626' : '#16a34a',
                          }}
                        >
                          {p.currentStock} {isLowStock && 'LOW'}
                        </span>
                      </td>
                      <td>{p.minStockAlert}</td>
                      <td>{p.location || '—'}</td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          {p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          {canManageProducts && (
                            <>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => openStockModal(p)}
                              >
                                Adjust Stock
                              </button>
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => openEditModal(p)}
                              >
                                Edit
                              </button>
                            </>
                          )}
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ background: '#f1f5f9', color: '#334155' }}
                            onClick={() => openLogsModal(p)}
                          >
                            Logs
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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

      {/* Modal: Add New Product */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Add New Product</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateProduct}>
              <div className="modal-body">
                {formError && <div className="alert alert-danger">{formError}</div>}

                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">SKU (Unique Barcode/Code) *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      placeholder="e.g. SKU-1001"
                      value={productForm.sku}
                      onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={productForm.category}
                      onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Unit Price (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="form-control"
                      required
                      value={productForm.unitPrice}
                      onChange={(e) =>
                        setProductForm({ ...productForm, unitPrice: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Initial Stock Quantity *</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      required
                      value={productForm.currentStock}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          currentStock: parseInt(e.target.value, 10) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Min Stock Threshold Alert</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={productForm.minStockAlert}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          minStockAlert: parseInt(e.target.value, 10) || 0,
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Warehouse Bin Location</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Rack B-12"
                      value={productForm.location}
                      onChange={(e) => setProductForm({ ...productForm, location: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Stock Movement (IN / OUT) */}
      {showStockModal && selectedProduct && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Adjust Stock - {selectedProduct.name}</h3>
              <button className="modal-close" onClick={() => setShowStockModal(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleAdjustStock}>
              <div className="modal-body">
                {stockError && <div className="alert alert-danger">{stockError}</div>}

                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Current Stock Level:</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
                    {selectedProduct.currentStock} units
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Movement Type *</label>
                  <select
                    className="form-control"
                    value={stockForm.type}
                    onChange={(e) =>
                      setStockForm({ ...stockForm, type: e.target.value as 'IN' | 'OUT' })
                    }
                  >
                    <option value="IN">IN (+) Add Stock Intake</option>
                    <option value="OUT">OUT (-) Reduce Stock Dispatch</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    required
                    value={stockForm.quantity}
                    onChange={(e) =>
                      setStockForm({ ...stockForm, quantity: parseInt(e.target.value, 10) || 1 })
                    }
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Reason / Reference Notes</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="e.g. Received shipment PO-9912 or Damaged goods return"
                    value={stockForm.reason}
                    onChange={(e) => setStockForm({ ...stockForm, reason: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowStockModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={stockSubmitting}>
                  {stockSubmitting ? 'Updating...' : 'Confirm Stock Movement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Product */}
      {showEditModal && editingProduct && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Edit Product Details</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleUpdateProduct}>
              <div className="modal-body">
                {editFormError && <div className="alert alert-danger">{editFormError}</div>}

                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={editProductForm.name}
                    onChange={(e) => setEditProductForm({ ...editProductForm, name: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">SKU *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={editProductForm.sku}
                      onChange={(e) => setEditProductForm({ ...editProductForm, sku: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={editProductForm.category}
                      onChange={(e) => setEditProductForm({ ...editProductForm, category: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Unit Price (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="form-control"
                      required
                      value={editProductForm.unitPrice}
                      onChange={(e) =>
                        setEditProductForm({
                          ...editProductForm,
                          unitPrice: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Current Stock *</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      required
                      value={editProductForm.currentStock}
                      onChange={(e) =>
                        setEditProductForm({
                          ...editProductForm,
                          currentStock: parseInt(e.target.value, 10) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Min Stock Threshold Alert</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={editProductForm.minStockAlert}
                      onChange={(e) =>
                        setEditProductForm({
                          ...editProductForm,
                          minStockAlert: parseInt(e.target.value, 10) || 0,
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Warehouse Bin Location</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editProductForm.location}
                      onChange={(e) => setEditProductForm({ ...editProductForm, location: e.target.value })}
                    />
                  </div>
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
                  {editSubmitting ? 'Saving Changes...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Stock Movement Logs */}
      {showLogsModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '850px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                Stock Movement Log Tracking
                {logsFilterProduct ? ` — ${logsFilterProduct.name} (${logsFilterProduct.sku})` : ' (All Products)'}
              </h3>
              <button className="modal-close" onClick={() => setShowLogsModal(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {logsLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>Loading stock logs...</div>
              ) : stockLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  No stock movements recorded yet.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        {!logsFilterProduct && <th>Product</th>}
                        <th>Type</th>
                        <th>Qty Changed</th>
                        <th>Reason / Reference</th>
                        <th>Created By</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockLogs.map((log) => (
                        <tr key={log.id}>
                          {!logsFilterProduct && (
                            <td>
                              <div style={{ fontWeight: 600 }}>{log.product?.name || '—'}</div>
                              <code style={{ fontSize: '0.75rem', color: '#64748b' }}>{log.product?.sku}</code>
                            </td>
                          )}
                          <td>
                            <span
                              className="badge"
                              style={{
                                backgroundColor: log.type === 'IN' ? '#dcfce7' : '#fee2e2',
                                color: log.type === 'IN' ? '#166534' : '#991b1b',
                                fontWeight: 700,
                              }}
                            >
                              {log.type === 'IN' ? 'IN (+)' : 'OUT (-)'}
                            </span>
                          </td>
                          <td>
                            <strong style={{ fontSize: '1rem', color: log.type === 'IN' ? '#16a34a' : '#dc2626' }}>
                              {log.type === 'IN' ? `+${log.quantity}` : `-${log.quantity}`}
                            </strong>
                          </td>
                          <td>{log.reason || '—'}</td>
                          <td>
                            <span style={{ fontSize: '0.85rem', color: '#475569' }}>{log.createdById}</span>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                              {new Date(log.createdAt).toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowLogsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Products;
