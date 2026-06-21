// src/security/pages/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { getStoredToken } from '../../auth/storage';
import { API_URL } from '../../config/api';
import { AlertCircle, Shield, Eye, Clock } from 'lucide-react';
import SecurityLayout from '../layout';

const API_KEY = import.meta.env.VITE_API_KEY;

interface HealthStats {
  status: string;
  total_requests: number;
  errors: number;
  error_rate: string;
  avg_response_time: string;
}

interface Alert {
  _id: string;
  ip_address: string;
  action_type: string;
  status_code: number;
  timestamp: string;
  username: string | null;
}

interface BlockedIP {
  _id: string;
  ip_address: string;
  reason: string;
  blocked_by: string;
  blocked_at: string;
  status: string;
  attack_count: number;
}

const Dashboard: React.FC = () => {
  const [health, setHealth] = useState<HealthStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [loading, setLoading] = useState(true);
  const token = getStoredToken();

  const headers = {
    Authorization: `Bearer ${token}`,
    ...(API_KEY ? { "x-api-key": API_KEY } : {}),
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch system health
        const healthRes = await fetch(`${API_URL}/api/security/system-health`, { headers });
        if (healthRes.ok) {
          const healthData = await healthRes.json();
          setHealth(healthData.health);
        }

        // Fetch real-time alerts
        const alertsRes = await fetch(`${API_URL}/api/security/real-time-alerts?limit=5`, { headers });
        if (alertsRes.ok) {
          const alertsData = await alertsRes.json();
          setAlerts(alertsData.alerts);
        }

        // Fetch blocked IPs
        const blockedRes = await fetch(`${API_URL}/api/security/blocked-ips?limit=5&status=active`, { headers });
        if (blockedRes.ok) {
          const blockedData = await blockedRes.json();
          setBlockedIPs(blockedData.blockedIPs);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    // Refresh data every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SecurityLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Security Dashboard</h1>
            <p className="text-gray-600 mt-2">Monitor server health and security events</p>
          </div>
        </div>

        {/* Stats Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                <div className="h-12 bg-gray-200 rounded w-12 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-6 bg-gray-300 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : (
          health && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* System Status */}
              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">System Status</p>
                    <p className="text-2xl font-bold capitalize text-gray-900 mt-2">
                      {health.status}
                    </p>
                  </div>
                  <Shield className="w-8 h-8 text-blue-500" />
                </div>
              </div>

              {/* Total Requests */}
              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total Requests (1h)</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{health.total_requests}</p>
                  </div>
                  <Eye className="w-8 h-8 text-green-500" />
                </div>
              </div>

              {/* Error Rate */}
              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Error Rate</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{health.error_rate}%</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
              </div>

              {/* Avg Response Time */}
              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Avg Response Time</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{health.avg_response_time}ms</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-500" />
                </div>
              </div>
            </div>
          )
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Real-time Alerts */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
              Real-time Alerts (Last Hour)
            </h2>
            <div className="space-y-3">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-gray-100 rounded h-12 animate-pulse"></div>
                  ))}
                </div>
              ) : alerts.length > 0 ? (
                alerts.map((alert) => (
                  <div key={alert._id} className="bg-gray-50 rounded-lg p-3 border-l-4 border-red-500">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{alert.ip_address}</p>
                        <p className="text-sm text-gray-600">{alert.action_type || 'HTTP ' + alert.status_code}</p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No alerts in the last hour</p>
              )}
            </div>
          </div>

          {/* Blocked IPs */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-blue-500" />
              Active Blocked IPs
            </h2>
            <div className="space-y-3">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-gray-100 rounded h-12 animate-pulse"></div>
                  ))}
                </div>
              ) : blockedIPs.length > 0 ? (
                blockedIPs.map((ip) => (
                  <div key={ip._id} className="bg-gray-50 rounded-lg p-3 border-l-4 border-blue-500">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{ip.ip_address}</p>
                        <p className="text-sm text-gray-600">{ip.reason}</p>
                      </div>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {ip.attack_count} attempts
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No active blocked IPs</p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <a href="/security/logs" className="bg-blue-50 hover:bg-blue-100 transition px-4 py-3 rounded-lg text-center font-medium text-blue-700">
              View Server Logs
            </a>
            <a href="/security/alerts" className="bg-red-50 hover:bg-red-100 transition px-4 py-3 rounded-lg text-center font-medium text-red-700">
              View All Alerts
            </a>
            <a href="/security/blocked-ips" className="bg-green-50 hover:bg-green-100 transition px-4 py-3 rounded-lg text-center font-medium text-green-700">
              Manage Blocked IPs
            </a>
            <a href="/security/ip-statistics" className="bg-purple-50 hover:bg-purple-100 transition px-4 py-3 rounded-lg text-center font-medium text-purple-700">
              IP Statistics
            </a>
          </div>
        </div>
      </div>
    </SecurityLayout>
  );
};

export default Dashboard;
