// src/security/pages/SystemHealth.tsx
import React, { useState, useEffect } from 'react';
import { getStoredToken } from '../../auth/storage';
import { API_URL } from '../../config/api';
import { Activity, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import SecurityLayout from '../layout';

const API_KEY = import.meta.env.VITE_API_KEY;

interface HealthStats {
  status: string;
  total_requests: number;
  errors: number;
  error_rate: string;
  avg_response_time: string;
}

const SystemHealth: React.FC = () => {
  const [health, setHealth] = useState<HealthStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(10000);
  const token = getStoredToken();

  const headers = {
    Authorization: `Bearer ${token}`,
    ...(API_KEY ? { "x-api-key": API_KEY } : {}),
  };

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/security/system-health`, { headers });
        if (res.ok) {
          const data = await res.json();
          setHealth(data.health);
        }
      } catch (error) {
        console.error('Error fetching system health:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();

    // Auto-refresh
    const interval = setInterval(fetchHealth, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const getHealthColor = (status: string) => {
    if (status === 'healthy') return 'text-green-600';
    if (status === 'degraded') return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBgColor = (status: string) => {
    if (status === 'healthy') return 'bg-green-50 border-green-200';
    if (status === 'degraded') return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const getHealthIcon = (status: string) => {
    if (status === 'healthy') return <CheckCircle className="w-12 h-12 text-green-600" />;
    if (status === 'degraded') return <AlertTriangle className="w-12 h-12 text-yellow-600" />;
    return <AlertTriangle className="w-12 h-12 text-red-600" />;
  };

  return (
    <SecurityLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">System Health</h1>
            <p className="text-gray-600 mt-2">Real-time server health monitoring</p>
          </div>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={5000}>Refresh: 5s</option>
            <option value={10000}>Refresh: 10s</option>
            <option value={30000}>Refresh: 30s</option>
            <option value={60000}>Refresh: 1m</option>
          </select>
        </div>

        {/* System Status Card */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          health && (
            <>
              <div className={`rounded-lg shadow p-8 border-2 ${getHealthBgColor(health.status)}`}>
                <div className="flex items-center gap-6">
                  {getHealthIcon(health.status)}
                  <div>
                    <h2 className={`text-3xl font-bold ${getHealthColor(health.status)}`}>
                      {health.status.charAt(0).toUpperCase() + health.status.slice(1)}
                    </h2>
                    <p className="text-gray-600 mt-1">
                      {health.status === 'healthy' 
                        ? 'All systems operational' 
                        : health.status === 'degraded'
                        ? 'Some performance issues detected'
                        : 'Critical issues detected'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Requests */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-600">Total Requests (1h)</h3>
                    <Activity className="w-5 h-5 text-blue-500" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{health.total_requests}</p>
                  <p className="text-xs text-gray-500 mt-2">Requests processed in the last hour</p>
                </div>

                {/* Errors */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-600">Errors (1h)</h3>
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{health.errors}</p>
                  <p className="text-xs text-gray-500 mt-2">Failed requests</p>
                </div>

                {/* Error Rate */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-600">Error Rate</h3>
                    <TrendingUp className="w-5 h-5 text-yellow-500" />
                  </div>
                  <p className={`text-3xl font-bold ${parseFloat(health.error_rate) > 5 ? 'text-red-600' : 'text-green-600'}`}>
                    {health.error_rate}%
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {parseFloat(health.error_rate) < 1 ? 'Excellent' : parseFloat(health.error_rate) < 5 ? 'Good' : 'Needs attention'}
                  </p>
                </div>

                {/* Avg Response Time */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-600">Avg Response Time</h3>
                    <Activity className="w-5 h-5 text-green-500" />
                  </div>
                  <p className={`text-3xl font-bold ${parseFloat(health.avg_response_time) > 500 ? 'text-red-600' : 'text-green-600'}`}>
                    {health.avg_response_time}ms
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {parseFloat(health.avg_response_time) < 100 ? 'Very fast' : parseFloat(health.avg_response_time) < 300 ? 'Good' : 'Slow'}
                  </p>
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 mb-3">Health Recommendations</h3>
                <ul className="space-y-2 text-sm text-blue-800">
                  {parseFloat(health.error_rate) > 5 && (
                    <li>• High error rate detected. Check logs for details.</li>
                  )}
                  {parseFloat(health.avg_response_time) > 500 && (
                    <li>• Response times are slow. Consider optimizing database queries or server resources.</li>
                  )}
                  {health.total_requests > 10000 && (
                    <li>• High traffic volume. Monitor server resources to ensure availability.</li>
                  )}
                  {parseFloat(health.error_rate) <= 1 && parseFloat(health.avg_response_time) <= 300 && (
                    <li>✓ System is performing well. No immediate action needed.</li>
                  )}
                </ul>
              </div>
            </>
          )
        )}
      </div>
    </SecurityLayout>
  );
};

export default SystemHealth;
