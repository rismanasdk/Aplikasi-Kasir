// src/security/pages/Alerts.tsx
import React, { useState, useEffect } from 'react';
import { getStoredToken } from '../../auth/storage';
import { API_URL } from '../../config/api';
import { AlertCircle, RefreshCw } from 'lucide-react';
import SecurityLayout from '../layout';

const API_KEY = import.meta.env.VITE_API_KEY;

interface Alert {
  _id: string;
  ip_address: string;
  method: string;
  url: string;
  status_code: number;
  action_type: string;
  username: string;
  timestamp: string;
  user_agent: string;
}

interface AlertSummary {
  total_alerts: number;
  alerts_by_ip: { [key: string]: number };
  last_hour: boolean;
}

const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [summary, setSummary] = useState<AlertSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const token = getStoredToken();

  const headers = {
    Authorization: `Bearer ${token}`,
    ...(API_KEY ? { "x-api-key": API_KEY } : {}),
  };

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/security/real-time-alerts?limit=100`, {
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();

    if (autoRefresh) {
      const interval = setInterval(fetchAlerts, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getSeverity = (statusCode: number): 'high' | 'medium' | 'low' => {
    if (statusCode === 401 || statusCode === 403) return 'high';
    if (statusCode >= 400 && statusCode < 500) return 'medium';
    return 'low';
  };

  const getSeverityColor = (severity: string) => {
    const colors: { [key: string]: string } = {
      high: 'bg-red-100 text-red-800 border-red-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      low: 'bg-blue-100 text-blue-800 border-blue-300',
    };
    return colors[severity] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  return (
    <SecurityLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Real-time Alerts</h1>
            <p className="text-gray-600 mt-2">Security events from the last hour</p>
          </div>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">Auto-refresh</span>
            </label>
            <button
              onClick={fetchAlerts}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
              <p className="text-gray-600 text-sm">Total Alerts (Last Hour)</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{summary.total_alerts}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm mb-3">Top Suspicious IPs</p>
              <div className="space-y-2">
                {Object.entries(summary.alerts_by_ip)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 3)
                  .map(([ip, count]) => (
                    <div key={ip} className="flex items-center justify-between">
                      <span className="font-mono text-sm text-gray-900">{ip}</span>
                      <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-sm font-semibold">
                        {count} events
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Alerts Feed */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : alerts.length > 0 ? (
            alerts.map((alert) => {
              const severity = getSeverity(alert.status_code);
              return (
                <div
                  key={alert._id}
                  className={`bg-white rounded-lg shadow p-4 border-l-4 border-opacity-50 ${getSeverityColor(
                    severity
                  )}`}
                >
                  <div className="flex items-start gap-4">
                    <AlertCircle className="w-5 h-5 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-sm">
                            {alert.action_type || `HTTP ${alert.status_code}`}
                          </h3>
                          <p className="text-xs mt-1 opacity-75">
                            {new Date(alert.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap capitalize ${
                          severity === 'high' ? 'bg-red-200' :
                          severity === 'medium' ? 'bg-yellow-200' :
                          'bg-blue-200'
                        }`}>
                          {severity}
                        </span>
                      </div>
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">IP:</span>
                          <span className="font-mono">{alert.ip_address}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Request:</span>
                          <span className="font-mono text-xs">{alert.method} {alert.url}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Status:</span>
                          <span className="font-mono">{alert.status_code}</span>
                        </div>
                        {alert.username && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">User:</span>
                            <span>{alert.username}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 bg-white rounded-lg">
              <p className="text-gray-500">No alerts in the last hour</p>
            </div>
          )}
        </div>
      </div>
    </SecurityLayout>
  );
};

export default Alerts;
