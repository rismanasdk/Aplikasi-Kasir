// src/security/pages/BlockedIPs.tsx
import React, { useState, useEffect } from 'react';
import { getStoredToken } from '../../auth/storage';
import { API_URL } from '../../config/api';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import SecurityLayout from '../layout';

const API_KEY = import.meta.env.VITE_API_KEY;

interface BlockedIP {
  _id: string;
  ip_address: string;
  reason: string;
  blocked_by: string;
  blocked_at: string;
  status: string;
  attack_count: number;
  block_type: string;
  duration_hours: number | null;
  auto_unblock_at: string | null;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const BlockedIPs: React.FC = () => {
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ ip_address: '', reason: '', duration_hours: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const token = getStoredToken();

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(API_KEY ? { "x-api-key": API_KEY } : {}),
  };

  const fetchBlockedIPs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/security/blocked-ips?page=${page}&limit=20`, {
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        setBlockedIPs(data.blockedIPs);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching blocked IPs:', error);
      setError('Failed to fetch blocked IPs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlockedIPs();
  }, [page]);

  const handleBlockIP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ip_address.trim()) {
      setError('IP address is required');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      // If editing, send PUT request instead
      if (editingId) {
        const response = await fetch(`${API_URL}/api/security/blocked-ips/${editingId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            reason: formData.reason || 'Suspicious activity',
          }),
        });

        if (response.ok) {
          setFormData({ ip_address: '', reason: '', duration_hours: '' });
          setEditingId(null);
          setShowModal(false);
          fetchBlockedIPs();
        } else {
          const data = await response.json();
          setError(data.message || 'Failed to update reason');
        }
      } else {
        // New block
        const body: { ip_address: string; reason: string; duration_hours?: number } = {
          ip_address: formData.ip_address.trim(),
          reason: formData.reason || 'Suspicious activity',
        };
        
        // Add duration if provided
        if (formData.duration_hours && formData.duration_hours !== '') {
          body.duration_hours = parseFloat(formData.duration_hours);
        }
        
        const response = await fetch(`${API_URL}/api/security/blocked-ips`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });

        if (response.ok) {
          setFormData({ ip_address: '', reason: '', duration_hours: '' });
          setShowModal(false);
          setPage(1);
          fetchBlockedIPs();
        } else {
          const data = await response.json();
          setError(data.message || 'Failed to block IP');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setError(editingId ? 'Failed to update reason' : 'Failed to block IP');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditReason = (ip: BlockedIP) => {
    setEditingId(ip.ip_address);
    setFormData({ ip_address: ip.ip_address, reason: ip.reason, duration_hours: '' });
    setShowModal(true);
  };

  const handleUnblockIP = async (ip: string) => {
    if (!confirm(`Are you sure you want to unblock ${ip}?`)) return;

    try {
      const response = await fetch(`${API_URL}/api/security/blocked-ips/${ip}`, {
        method: 'DELETE',
        headers,
      });

      if (response.ok) {
        fetchBlockedIPs();
      } else {
        setError('Failed to unblock IP');
      }
    } catch (error) {
      console.error('Error unblocking IP:', error);
      setError('Failed to unblock IP');
    }
  };

  return (
    <SecurityLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Blocked IP Addresses</h1>
            <p className="text-gray-600 mt-2">Manage blocked IP addresses to prevent unauthorized access</p>
          </div>
          <button
            onClick={() => {
              setFormData({ ip_address: '', reason: '', duration_hours: '' });
              setEditingId(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Block IP
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Modal for blocking/editing IP */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingId ? 'Edit Block Reason' : 'Block IP Address'}
              </h2>
              <form onSubmit={handleBlockIP} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                  <input
                    type="text"
                    placeholder="192.168.1.1"
                    value={formData.ip_address}
                    onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                    disabled={!!editingId}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <textarea
                    placeholder="Why is this IP being blocked?"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                  />
                </div>
                {!editingId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration (Hours) <span className="text-gray-500 text-xs">(Leave empty for permanent)</span>
                    </label>
                    <input
                      type="number"
                      min="0.083"
                      step="0.083"
                      placeholder="e.g., 1 for 1 hour, 0.5 for 30 minutes"
                      value={formData.duration_hours}
                      onChange={(e) => setFormData({ ...formData, duration_hours: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">0.083 = 5 minutes, 1 = 1 hour, 24 = 1 day</p>
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingId(null);
                      setFormData({ ip_address: '', reason: '', duration_hours: '' });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                  >
                    {submitting ? (editingId ? 'Updating...' : 'Blocking...') : (editingId ? 'Update' : 'Block IP')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Blocked IPs Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">IP Address</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Reason</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Blocked By</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Blocked At</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Auto-Unblock</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </td>
                  </tr>
                ) : blockedIPs.length > 0 ? (
                  blockedIPs.map((ip) => (
                    <tr key={ip._id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm font-mono font-semibold text-gray-900">
                        {ip.ip_address}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">{ip.reason}</td>
                      <td className="px-6 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          ip.block_type === 'automatic'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {ip.block_type === 'automatic' ? 'Auto' : 'Manual'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">{ip.blocked_by}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {new Date(ip.blocked_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {ip.auto_unblock_at
                          ? new Date(ip.auto_unblock_at).toLocaleString()
                          : 'Never'}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          ip.status === 'active'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {ip.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUnblockIP(ip.ip_address)}
                            className="text-red-600 hover:text-red-900 font-medium"
                            title="Unblock IP"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditReason(ip)}
                            className="text-blue-600 hover:text-blue-900 font-medium"
                            title="Edit reason"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      No blocked IP addresses
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && (
            <div className="bg-gray-50 px-6 py-4 border-t flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, pagination.total)} of{' '}
                {pagination.total} blocked IPs
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  Previous
                </button>
                {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                  .slice(Math.max(0, page - 3), Math.min(pagination.pages, page + 2))
                  .map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        p === page
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                <button
                  onClick={() => setPage(Math.min(pagination.pages, page + 1))}
                  disabled={page === pagination.pages}
                  className="px-3 py-1 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </SecurityLayout>
  );
};

export default BlockedIPs;
