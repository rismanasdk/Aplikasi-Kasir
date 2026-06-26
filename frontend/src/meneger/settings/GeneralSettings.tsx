// src/meneger/settings/GeneralSettings.tsx

interface GeneralSettingsProps {
  taxRate: number;
  globalDiscount: number;
}

export default function GeneralSettings({ taxRate, globalDiscount }: GeneralSettingsProps) {
  return (
    <div className="p-6 bg-white">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Pengaturan Umum</h2>
      <p className="text-gray-600 mb-6">Lihat informasi pajak dan diskon global untuk toko Anda</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Tax Rate */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100 shadow-sm">
          <div className="flex items-center mb-4">
            <h3 className="text-xl font-medium text-gray-800">Pajak</h3>
          </div>
          <div className="mt-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Persentase Pajak (%)</label>
            <div className="relative">
              <input
                type="number"
                value={taxRate}
                readOnly
                className="w-full p-4 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-lg"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500 text-lg font-medium">%</span>
              </div>
            </div>
            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm text-blue-700">
                <span className="font-medium">Info:</span> Persentase pajak yang diterapkan pada setiap transaksi
              </p>
            </div>
          </div>
        </div>
        
        {/* Global Discount */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100 shadow-sm">
          <div className="flex items-center mb-4">
            <h3 className="text-xl font-medium text-gray-800">Diskon Global</h3>
          </div>
          <div className="mt-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Persentase Diskon (%)</label>
            <div className="relative">
              <input
                type="number"
                value={globalDiscount}
                readOnly
                className="w-full p-4 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-lg"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500 text-lg font-medium">%</span>
              </div>
            </div>
            <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-100">
              <p className="text-sm text-green-700">
                <span className="font-medium">Info:</span> Diskon default yang diterapkan pada semua transaksi
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Preview Section */}
      <div className="mt-10 bg-gray-50 p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg font-medium text-gray-800 mb-4">Preview Perhitungan</h3>
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">Rp 100.000</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pajak ({taxRate}%)</span>
              <span className="font-medium">Rp {100000 * taxRate / 100}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Diskon ({globalDiscount}%)</span>
              <span className="font-medium">-Rp {100000 * globalDiscount / 100}</span>
            </div>
            <div className="border-t border-gray-200 pt-3 mt-2">
              <div className="flex justify-between">
                <span className="font-bold text-gray-800">Total</span>
                <span className="font-bold text-lg text-blue-600">
                  Rp {100000 + (100000 * taxRate / 100) - (100000 * globalDiscount / 100)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}