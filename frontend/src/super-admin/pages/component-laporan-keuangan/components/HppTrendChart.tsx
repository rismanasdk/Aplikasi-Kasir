import React from 'react';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line } from 'recharts';
import LoadingSpinner from '../../../../components/LoadingSpinner';

interface HppTrendChartProps {
  loadingBulan: boolean;
  hppChartData: Array<{ name: string; fullName: string; total_hpp: number }>;
  formatRupiah: (amount: number) => string;
}

const HppTrendChart: React.FC<HppTrendChartProps> = ({ loadingBulan, hppChartData, formatRupiah }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8 border border-gray-200">
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          Trend Total HPP (1 Tahun Terakhir)
        </h2>
        <p className="text-sm text-gray-600 mt-1">Pergerakan Harga Pokok Penjualan per bulan</p>
      </div>
      <div className="p-6">
        {loadingBulan ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner />
          </div>
        ) : hppChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={hppChartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={{ stroke: '#E5E7EB' }} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#6B7280' }}
                axisLine={{ stroke: '#E5E7EB' }}
                tickLine={false}
                tickFormatter={(value: number) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}jt`;
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}rb`;
                  return String(value);
                }}
              />
              <Tooltip
                formatter={(value: number | string) => [formatRupiah(Number(value)), 'Total HPP']}
                labelFormatter={(label, payload) => {
                  if (payload?.length && payload[0]?.payload?.fullName) {
                    return payload[0].payload.fullName;
                  }
                  return String(label);
                }}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                }}
              />
              <Line
                type="monotone"
                dataKey="total_hpp"
                stroke="#10B981"
                strokeWidth={3}
                dot={{ r: 5, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 7, fill: '#059669', stroke: '#fff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex justify-center items-center h-64 text-gray-400">
            <p className="text-sm">Belum ada data HPP</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HppTrendChart;
