// src/security/pages/Logs.tsx
import React, { useState, useEffect } from 'react';
import { getStoredToken } from '../../auth/storage';
import { API_URL } from '../../config/api';
import { Download, Filter } from 'lucide-react';
import SecurityLayout from '../layout';

const API_KEY = import.meta.env.VITE_API_KEY;

interface ServerLog {
  _id: string;
  ip_address: string;
  method: string;
  url: string;
  status_code: number;
  response_time: number;
  user_agent: string;
  username: string;
  action_type: string;
  timestamp: string;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const Logs: React.FC = () => {
  const [logs, setLogs] = useState<ServerLog[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [filters, setFilters] = useState({
    status_code: '',
    action_type: '',
    ip_address: '',
  });
  const token = getStoredToken();

  const headers = {
    Authorization: `Bearer ${token}`,
    ...(API_KEY ? { "x-api-key": API_KEY } : {}),
  };

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const queryParams = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          ...(filters.status_code && { status_code: filters.status_code }),
          ...(filters.action_type && { action_type: filters.action_type }),
          ...(filters.ip_address && { ip_address: filters.ip_address }),
        });

        const res = await fetch(`${API_URL}/api/security/logs?${queryParams}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setLogs(data.logs);
          setPagination(data.pagination);
        }
      } catch (error) {
        console.error('Error fetching logs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [page, limit, filters]);

  const getStatusColor = (status: number) => {
    if (status < 300) return 'bg-green-100 text-green-800';
    if (status < 400) return 'bg-blue-100 text-blue-800';
    if (status < 500) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getMethodColor = (method: string) => {
    const colors: { [key: string]: string } = {
      GET: 'bg-blue-100 text-blue-800',
      POST: 'bg-green-100 text-green-800',
      PUT: 'bg-yellow-100 text-yellow-800',
      DELETE: 'bg-red-100 text-red-800',
      PATCH: 'bg-purple-100 text-purple-800',
    };
    return colors[method] || 'bg-gray-100 text-gray-800';
  };

  return (
    <SecurityLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Server Logs</h1>
            <p className="text-gray-600 mt-2">View all server requests and activities</p>
          </div>
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status Code</label>
              <input
                type="text"
                placeholder="e.g., 200, 401"
                value={filters.status_code}
                onChange={(e) => {
                  setFilters({ ...filters, status_code: e.target.value });
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
              <select
                value={filters.action_type}
                onChange={(e) => {
                  setFilters({ ...filters, action_type: e.target.value });
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="LOGIN">LOGIN</option>
                <option value="LOGOUT">LOGOUT</option>
                <option value="UNAUTHORIZED">UNAUTHORIZED</option>
                <option value="FORBIDDEN">FORBIDDEN</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
              <input
                type="text"
                placeholder="e.g., 192.168.1.1"
                value={filters.ip_address}
                onChange={(e) => {
                  setFilters({ ...filters, ip_address: e.target.value });
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Items per page</label>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(parseInt(e.target.value));
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
              </select>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Time</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">IP Address</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Method</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">URL</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Response Time</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </td>
                  </tr>
                ) : logs.length > 0 ? (
                  logs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm text-gray-900 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-900 whitespace-nowrap font-mono">
                        {log.ip_address}
                      </td>
                      <td className="px-6 py-3 text-sm whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getMethodColor(log.method)}`}>
                          {log.method}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-900 max-w-xs truncate" title={log.url}>
                        {log.url}
                      </td>
                      <td className="px-6 py-3 text-sm whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(log.status_code)}`}>
                          {log.status_code}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-900 whitespace-nowrap">
                        {log.response_time}ms
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <button className="text-blue-600 hover:text-blue-900 font-medium">
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      No logs found
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
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, pagination.total)} of{' '}
                {pagination.total} logs
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

export default Logs;
