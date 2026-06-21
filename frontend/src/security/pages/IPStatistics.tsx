// src/security/pages/IPStatistics.tsx
import React, { useState, useEffect } from 'react';
import { getStoredToken } from '../../auth/storage';
import { API_URL } from '../../config/api';
import SecurityLayout from '../layout';

const API_KEY = import.meta.env.VITE_API_KEY;

interface IPStat {
  _id: string;
  total_requests: number;
  failed_requests: number;
  last_request: string;
  user_agents: string[];
}

const IPStatistics: React.FC = () => {
  const [stats, setStats] = useState<IPStat[]>([]);
  const [loading, setLoading] = useState(true);
  const token = getStoredToken();

  const headers = {
    Authorization: `Bearer ${token}`,
    ...(API_KEY ? { "x-api-key": API_KEY } : {}),
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/security/ip-statistics?days=7`, { headers });
        if (res.ok) {
          const data = await res.json();
          setStats(data.statistics);
        }
      } catch (error) {
        console.error('Error fetching IP statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const getErrorRate = (total: number, failed: number) => {
    if (total === 0) return '0.00';
    return ((failed / total) * 100).toFixed(2);
  };

  return (
    <SecurityLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">IP Statistics</h1>
          <p className="text-gray-600 mt-2">Last 7 days activity by IP address</p>
        </div>

        {/* Stats Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">IP Address</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Total Requests</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Failed Requests</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Error Rate</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Last Request</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </td>
                  </tr>
                ) : stats.length > 0 ? (
                  stats.map((stat, idx) => {
                    const errorRate = getErrorRate(stat.total_requests, stat.failed_requests);
                    const isHighRisk = parseFloat(errorRate) > 10;

                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm font-mono font-semibold text-gray-900">
                          {stat._id}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-900">
                          {stat.total_requests}
                        </td>
                        <td className="px-6 py-3 text-sm">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-700 font-semibold">
                            {stat.failed_requests}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            isHighRisk
                              ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {errorRate}%
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          {new Date(stat.last_request).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No statistics available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SecurityLayout>
  );
};

export default IPStatistics;
