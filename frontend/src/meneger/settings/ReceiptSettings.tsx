// src/meneger/settings/ReceiptSettings.tsx

interface ReceiptSettingsProps {
  receiptHeader: string;
  receiptFooter: string;
}

export default function ReceiptSettings({ receiptHeader, receiptFooter }: ReceiptSettingsProps) {
  return (
    <div className="p-6 bg-white">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Pengaturan Struk</h2>
      <p className="text-gray-600 mb-6">Lihat tampilan header dan footer struk untuk toko Anda</p>
      
      <div className="space-y-8">
        {/* Receipt Header */}
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-6 rounded-xl border border-purple-100 shadow-sm">
          <div className="flex items-center mb-4">
            <h3 className="text-xl font-medium text-gray-800">Header Struk</h3>
          </div>
          <div className="mt-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Teks Header</label>
            <textarea
              value={receiptHeader}
              readOnly
              className="w-full p-4 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
              rows={4}
            />
            <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
              <p className="text-sm text-purple-700">
                <span className="font-medium">Info:</span> Teks yang muncul di bagian atas struk
              </p>
            </div>
            
            {/* Preview */}
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white">
                <div className="max-w-xs mx-auto bg-white p-4 shadow-sm">
                  <div className="text-center text-sm font-mono whitespace-pre-line">
                    {receiptHeader || 'Contoh: Aplikasi Kasir\nJl. Merdeka No. 123\nTelp: 0812-3456-7890'}
                  </div>
                  <div className="border-t border-b border-gray-300 my-2 py-1 text-center text-xs">
                    <div className="font-bold">TOKO SERBA ADA</div>
                  </div>
                  <div className="text-xs">
                    <div className="flex justify-between">
                      <span>1x Item A</span>
                      <span>Rp 50.000</span>
                    </div>
                    <div className="flex justify-between">
                      <span>2x Item B</span>
                      <span>Rp 30.000</span>
                    </div>
                  </div>
                  <div className="border-t border-gray-300 mt-2 pt-1">
                    <div className="flex justify-between font-bold">
                      <span>TOTAL</span>
                      <span>Rp 80.000</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Receipt Footer */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-xl border border-indigo-100 shadow-sm">
          <div className="flex items-center mb-4">
            <h3 className="text-xl font-medium text-gray-800">Footer Struk</h3>
          </div>
          <div className="mt-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Teks Footer</label>
            <textarea
              value={receiptFooter}
              readOnly
              className="w-full p-4 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
              rows={4}
            />
            <div className="mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
              <p className="text-sm text-indigo-700">
                <span className="font-medium">Info:</span> Teks yang muncul di bagian bawah struk
              </p>
            </div>
            
            {/* Preview */}
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white">
                <div className="max-w-xs mx-auto bg-white p-4 shadow-sm">
                  <div className="text-center text-xs">
                    <div className="border-t border-gray-300 mt-2 pt-2">
                      <div className="flex justify-between font-bold">
                        <span>TOTAL</span>
                        <span>Rp 80.000</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span>TUNAI</span>
                        <span>Rp 100.000</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>KEMBALI</span>
                        <span>Rp 20.000</span>
                      </div>
                    </div>
                    <div className="text-center mt-3 text-xs font-mono whitespace-pre-line">
                      {receiptFooter || 'Contoh: Terima kasih atas kunjungan Anda!\nFollow IG: @AplikasiKasir'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}