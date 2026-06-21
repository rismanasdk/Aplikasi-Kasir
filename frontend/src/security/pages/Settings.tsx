// src/security/pages/Settings.tsx
import React, { useState, useEffect } from 'react';
import { Settings, Shield, Bell, Lock, Eye } from 'lucide-react';
import SecurityLayout from '../layout';

const SecuritySettings: React.FC = () => {
  const defaultSettings = {
    alertThreshold: 10,
    autoBlockAfterAttempts: 5,
    blockDuration: 24,
    enableNotifications: true,
    logRetentionDays: 30,
  };

  const [settings, setSettings] = useState(defaultSettings);
  const [saved, setSaved] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('securitySettings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error('Failed to parse saved settings:', error);
        setSettings(defaultSettings);
      }
    }
  }, []);

  const handleChange = (key: string, value: any) => {
    setSettings({ ...settings, [key]: value });
    setSaved(false);
  };

  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem('securitySettings', JSON.stringify(settings));
    
    // TODO: Save to backend API when ready
    // fetch(`${API_URL}/api/security/settings`, {
    //   method: 'PUT',
    //   headers: { Authorization: `Bearer ${token}` },
    //   body: JSON.stringify(settings)
    // })
    
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <SecurityLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Security Settings</h1>
          <p className="text-gray-600 mt-2">Configure security module preferences and thresholds</p>
        </div>

        {/* Save Notification */}
        {saved && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
            ✓ Settings saved successfully
          </div>
        )}

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Alert Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Alert Settings</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alert Threshold (Failed Attempts)
                </label>
                <input
                  type="number"
                  min="1"
                  value={settings.alertThreshold}
                  onChange={(e) => handleChange('alertThreshold', parseInt(e.target.value))}
                  className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Alert will trigger after this many failed attempts</p>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableNotifications}
                    onChange={(e) => handleChange('enableNotifications', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">Enable Notifications</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">Receive notifications for critical security events</p>
              </div>
            </div>
          </div>

          {/* Blocking Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-red-600" />
              <h2 className="text-xl font-bold text-gray-900">IP Blocking Settings</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Auto Block After Failed Attempts
                </label>
                <input
                  type="number"
                  min="1"
                  value={settings.autoBlockAfterAttempts}
                  onChange={(e) => handleChange('autoBlockAfterAttempts', parseInt(e.target.value))}
                  className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">IP will be automatically blocked after this many failed attempts</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Block Duration (Hours)
                </label>
                <input
                  type="number"
                  min="0.083"
                  step="0.083"
                  value={settings.blockDuration}
                  onChange={(e) => handleChange('blockDuration', parseFloat(e.target.value))}
                  className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Default duration for manually blocked IPs (0.083 = 5 min, 1 = 1 hour, 24 = 1 day)</p>
              </div>
            </div>
          </div>

          {/* Data Retention */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-green-600" />
              <h2 className="text-xl font-bold text-gray-900">Data Retention</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Log Retention Period (Days)
                </label>
                <input
                  type="number"
                  min="7"
                  value={settings.logRetentionDays}
                  onChange={(e) => handleChange('logRetentionDays', parseInt(e.target.value))}
                  className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Server logs older than this will be automatically deleted</p>
              </div>
            </div>
          </div>

          {/* Security Best Practices */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-blue-900">Security Best Practices</h2>
            </div>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>• Regularly review blocked IPs and adjust settings based on traffic patterns</li>
              <li>• Monitor real-time alerts to detect suspicious activities early</li>
              <li>• Keep server logs for at least 30 days for compliance and investigation</li>
              <li>• Set reasonable alert thresholds to avoid false positives</li>
              <li>• Review IP statistics weekly to identify potential threats</li>
            </ul>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
          >
            Save Settings
          </button>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </SecurityLayout>
  );
};

export default SecuritySettings;
