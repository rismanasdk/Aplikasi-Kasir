import React, { useEffect, useState, useCallback } from "react";
import { API_URL } from "../../../config/api";
import LoadingSpinner from "../../../components/LoadingSpinner";
import { SweetAlert } from "../../../components/SweetAlert";
import { Calendar, DollarSign, FileText, Plus, Trash2, Search } from "lucide-react";
import { getStoredToken } from "../../../auth/storage";
import { formatNumber, parseInputNumber } from "../../utils/formatRupiah";
const API_KEY = import.meta.env.VITE_API_KEY;

interface Kategori { _id: string; nama: string; isActive: boolean }
// ✅ FIX 1: Tambahkan null ke interface
interface Pengeluaran { 
  _id: string; 
  kategoriId: Kategori | string | null;  // ← Tambahkan | null
  jumlah: number; 
  tanggal: string; 
  keterangan?: string 
}

const CAT_API = `${API_URL}/api/super-admin/biaya-operasional`;
const PENGELUARAN_API = `${API_URL}/api/super-admin/pengeluaran-biaya`;

const InputBiaya: React.FC = () => {
  const [categories, setCategories] = useState<Kategori[]>([]);
  const [loading, setLoading] = useState(true);
  const [kategori, setKategori] = useState<string>("");
  const [jumlah, setJumlah] = useState<number>(0);
  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().slice(0, 10));
  const [keterangan, setKeterangan] = useState<string>("");
  const [history, setHistory] = useState<Pengeluaran[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const getAuthHeaders = (json = false): HeadersInit => {
    const token = getStoredToken();
    if (!token) {
      throw new Error('Sesi login tidak ditemukan. Silakan login ulang dengan akun admin.');
    }
    return {
      ...(json ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
      ...(API_KEY ? { "x-api-key": API_KEY } : {}),
    };
  };

  // ✅ FIX 2: Helper function untuk mendapatkan nama kategori dengan aman
  const getKategoriNama = (kategoriId: Kategori | string | null): string => {
    if (!kategoriId) return 'Kategori tidak ditemukan';
    if (typeof kategoriId === 'string') {
      // Cari nama dari list categories
      const found = categories.find(c => c._id === kategoriId);
      return found ? found.nama : kategoriId;
    }
    return kategoriId.nama || 'Kategori tidak ditemukan';
  };

  // ✅ FIX 3: Helper function untuk mendapatkan ID kategori
  const getKategoriId = (kategoriId: Kategori | string | null): string => {
    if (!kategoriId) return '';
    if (typeof kategoriId === 'string') return kategoriId;
    return kategoriId._id || '';
  };

  const isCurrentMonth = (dateValue: string): boolean => {
    const date = new Date(dateValue);
    const now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  };

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(CAT_API, { headers: getAuthHeaders() });
      const data = await res.json();
      setCategories((data || []).filter((c: Kategori) => c.isActive));
      if ((data || []).length > 0 && !kategori) setKategori(data[0]._id);
    } catch (err) {
      console.error(err);
      SweetAlert.error("Gagal memuat kategori");
    }
  }, [kategori]);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(PENGELUARAN_API, { headers: getAuthHeaders() });
      const data = await res.json();
      setHistory(data || []);
    } catch (err) {
      console.error(err);
      SweetAlert.error("Gagal memuat histori pengeluaran");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); fetchHistory(); }, [fetchCategories, fetchHistory]);

  const submit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!kategori) return SweetAlert.error("Pilih kategori");
    if (!jumlah || jumlah <= 0) return SweetAlert.error("Jumlah harus > 0");
    if (!tanggal) return SweetAlert.error("Tanggal wajib diisi");

    try {
      await SweetAlert.loading("Menyimpan pengeluaran...");
      const res = await fetch(PENGELUARAN_API, {
        method: "POST",
        headers: getAuthHeaders(true),
        body: JSON.stringify({ kategoriId: kategori, jumlah, tanggal, keterangan })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        SweetAlert.close();
        return SweetAlert.error((data && data.message) ? data.message : "Gagal menyimpan pengeluaran");
      }
      SweetAlert.close();
      SweetAlert.success((data && data.message) ? data.message : "Pengeluaran tersimpan");
      setJumlah(0);
      setKeterangan("");
      fetchHistory();
    } catch (err) {
      SweetAlert.close();
      console.error(err);
      SweetAlert.error("Gagal menyimpan pengeluaran");
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      await SweetAlert.loading("Menghapus pengeluaran...");
      const res = await fetch(`${PENGELUARAN_API}/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(true)
      });
      if (!res.ok) throw new Error("HTTP error");
      SweetAlert.close();
      SweetAlert.success("Pengeluaran dihapus");
      setShowDeleteConfirm(null);
      fetchHistory();
    } catch (err) {
      SweetAlert.close();
      console.error(err);
      SweetAlert.error("Gagal menghapus pengeluaran");
    }
  };

  // ✅ FIX 4: Gunakan helper function di filter
  const filteredHistory = history.filter(item => {
    const kategoriNama = getKategoriNama(item.kategoriId).toLowerCase();
    const kategoriId = getKategoriId(item.kategoriId);
    
    const matchesSearch = searchTerm === "" ||
      kategoriNama.includes(searchTerm.toLowerCase()) ||
      (item.keterangan && item.keterangan.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = filterCategory === "" || kategoriId === filterCategory;

    return matchesSearch && matchesCategory;
  });

  const currentMonthHistory = filteredHistory.filter(item => isCurrentMonth(item.tanggal));
  const totalBulanIni = currentMonthHistory.reduce((sum, item) => sum + item.jumlah, 0);

  if (loading) return <div className="p-6"><LoadingSpinner /></div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">Input Pengeluaran Biaya</h3>
      </div>

      <div className="p-6">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
              <div className="relative">
                <select
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                  className="mt-1 w-full p-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                >
                  {categories.map(c => <option key={c._id} value={c._id}>{c.nama}</option>)}
                </select>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FileText className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Jumlah (Rp)</label>
              <div className="relative">
                <input
                  type="text"
                  value={formatNumber(jumlah)}
                  onChange={e => setJumlah(parseInputNumber(e))}
                  className="mt-1 w-full p-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  placeholder="0"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal</label>
              <div className="relative">
                <input
                  type="date"
                  value={tanggal}
                  onChange={e => setTanggal(e.target.value)}
                  className="mt-1 w-full p-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Keterangan (opsional)</label>
            <input
              value={keterangan}
              onChange={e => setKeterangan(e.target.value)}
              className="mt-1 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
              placeholder="Tambahkan keterangan..."
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Simpan Pengeluaran</span>
            </button>
          </div>
        </form>

        <div className="mt-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
            <h4 className="text-lg font-semibold text-gray-900">Riwayat Pengeluaran</h4>
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari pengeluaran..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 w-64"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
              </div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
              >
                <option value="">Semua Kategori</option>
                {categories.map(c => (
                  <option key={c._id} value={c._id}>{c.nama}</option>
                ))}
              </select>
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Tidak ada pengeluaran</h3>
              <p className="text-sm text-gray-500">
                {searchTerm || filterCategory ? "Coba ubah filter atau kata kunci pencarian" : "Tambahkan pengeluaran untuk melihat riwayat"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    <th className="pb-3 font-medium">Tanggal</th>
                    <th className="pb-3 font-medium">Nama Biaya</th>
                    <th className="pb-3 font-medium">Jumlah</th>
                    <th className="pb-3 font-medium">Keterangan</th>
                    <th className="pb-3 font-medium text-right w-20">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredHistory.map((h, index) => {
                    const kategoriNama = getKategoriNama(h.kategoriId);
                    const isKategoriNotFound = !h.kategoriId;
                    
                    return (
                        <tr 
                            key={h._id} 
                            className={`${index % 2 === 0 ? 'bg-white' : 'bg-amber-50'} hover:bg-amber-100 transition-colors`}
                        >
                        <td className="py-3">{new Date(h.tanggal).toLocaleDateString('id-ID')}</td>
                        <td className="py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isKategoriNotFound 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {kategoriNama}
                          </span>
                        </td>
                        <td className="py-3 font-medium">Rp {h.jumlah.toLocaleString('id-ID')}</td>
                        <td className="py-3 text-gray-500">{h.keterangan || '-'}</td>
                        <td className="py-3">
                          <div className="flex items-center justify-end">
                            {showDeleteConfirm === h._id ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => deleteExpense(h._id)}
                                  className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors duration-200"
                                >
                                  Ya
                                </button>
                                <button
                                  onClick={() => setShowDeleteConfirm(null)}
                                  className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors duration-200"
                                >
                                  Batal
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setShowDeleteConfirm(h._id)}
                                className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:text-white hover:bg-red-600 rounded-lg border border-red-200 hover:border-red-600 transition-all duration-200"
                                title="Hapus"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Menampilkan {filteredHistory.length} dari {history.length} pengeluaran
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Total bulan ini</div>
                  <div className="text-lg font-semibold text-gray-900">
                    Rp {totalBulanIni.toLocaleString('id-ID')}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InputBiaya;
