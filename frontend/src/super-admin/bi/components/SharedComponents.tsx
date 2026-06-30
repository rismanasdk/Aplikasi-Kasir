import React from 'react';

// ============================================================
//  Utility: format Rupiah
// ============================================================
export const rp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

export const pct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

// ============================================================
//  Trend badge
// ============================================================
export const TrendBadge: React.FC<{ value: number }> = ({ value }) => {
  if (value > 2) return <span className="inline-flex items-center text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">▲ {value.toFixed(1)}%</span>;
  if (value < -2) return <span className="inline-flex items-center text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">▼ {Math.abs(value).toFixed(1)}%</span>;
  return <span className="inline-flex items-center text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">— stabil</span>;
};

// ============================================================
//  Section wrapper
// ============================================================
export const BISection: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 ${className}`}>
    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">{title}</h3>
    {children}
  </div>
);

// ============================================================
//  Stat card
// ============================================================
export const StatCard: React.FC<{ label: string; value: string; sub?: string; trend?: number; color?: string }> = ({
  label, value, sub, trend, color = 'blue'
}) => {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    red: 'from-red-500 to-red-600',
    amber: 'from-amber-500 to-amber-600',
    purple: 'from-purple-500 to-purple-600',
    indigo: 'from-indigo-500 to-indigo-600',
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">{label}</span>
        {trend !== undefined && <TrendBadge value={trend} />}
      </div>
      <div className="text-2xl font-bold text-gray-800">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
      <div className={`mt-3 h-1 rounded-full bg-gradient-to-r ${colorMap[color] || colorMap.blue}`} />
    </div>
  );
};

// ============================================================
//  Narasi box
// ============================================================
export const NarasiBox: React.FC<{ text: string; type?: 'info' | 'warning' | 'success' | 'danger' }> = ({ text, type = 'info' }) => {
  const styles: Record<string, string> = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    danger: 'bg-red-50 border-red-200 text-red-800',
  };
  return (
    <div className={`rounded-lg border p-4 text-sm leading-relaxed ${styles[type]}`}>
      {text}
    </div>
  );
};

// ============================================================
//  Simple bar (CSS-only, no chart library needed)
// ============================================================
export const SimpleBar: React.FC<{ label: string; value: number; max: number; color?: string; suffix?: string }> = ({
  label, value, max, color = 'bg-blue-500', suffix = ''
}) => {
  const pctWidth = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span className="truncate max-w-[60%]">{label}</span>
        <span className="font-medium">{rp(value)}{suffix}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all duration-500`} style={{ width: `${pctWidth}%` }} />
      </div>
    </div>
  );
};

// ============================================================
//  Priority badge
// ============================================================
export const PriorityBadge: React.FC<{ level: string }> = ({ level }) => {
  const map: Record<string, string> = {
    tinggi: 'bg-red-100 text-red-700',
    sedang: 'bg-amber-100 text-amber-700',
    rendah: 'bg-blue-100 text-blue-700',
  };
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[level] || map.rendah}`}>{level}</span>;
};

// ============================================================
//  Risk score gauge (0-100)
// ============================================================
export const RiskGauge: React.FC<{ score: number; status: string }> = ({ score, status }) => {
  const color = score >= 60 ? 'text-red-600' : score >= 30 ? 'text-amber-600' : 'text-emerald-600';
  const bgColor = score >= 60 ? 'bg-red-500' : score >= 30 ? 'bg-amber-500' : 'bg-emerald-500';
  const statusColor = score >= 60 ? 'bg-red-50 text-red-700 border-red-200' : score >= 30 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200';

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="8" />
          <circle cx="50" cy="50" r="42" fill="none" className={bgColor} strokeWidth="8"
            strokeDasharray={`${(score / 100) * 264} 264`} strokeLinecap="round" />
        </svg>
        <div className={`absolute inset-0 flex items-center justify-center text-2xl font-bold ${color}`}>
          {score}
        </div>
      </div>
      <div className={`mt-2 px-3 py-1 rounded-full border text-sm font-semibold ${statusColor}`}>
        {status.toUpperCase()}
      </div>
    </div>
  );
};

// ============================================================
//  Empty state
// ============================================================
export const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="text-center py-12 text-gray-400">
    <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
    <p className="text-sm">{message}</p>
  </div>
);

// ============================================================
//  Loading skeleton
// ====================================================
export const Skeleton: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <div className="space-y-3 animate-pulse">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-4 bg-gray-200 rounded" style={{ width: `${60 + Math.random() * 40}%` }} />
    ))}
  </div>
);

// ============================================================
//  Table helper
// ============================================================
export const DataTable: React.FC<{ headers: string[]; rows: (string | number)[][] }> = ({ headers, rows }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200">
          {headers.map((h, i) => <th key={i} className="text-left py-2 px-3 font-semibold text-gray-600 text-xs uppercase">{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
            {row.map((cell, j) => <td key={j} className="py-2.5 px-3 text-gray-700">{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);