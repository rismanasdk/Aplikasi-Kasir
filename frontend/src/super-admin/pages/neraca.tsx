import React, { useCallback, useEffect, useState } from 'react';
import { API_URL } from '../../config/api';
import { getStoredToken } from '../../auth/storage';
import LoadingSpinner from '../../components/LoadingSpinner';

const API_KEY = import.meta.env.VITE_API_KEY;

interface NeracaItem {
  nama: string;
  total: number;
}

interface NeracaResponse {
  tanggal: string;
  aset: {
    lancar: NeracaItem[];
    tetap: NeracaItem[];
    total_aset_lancar: number;
    total_aset_tetap: number;
    total_aset: number;
  };
  liabilitas: {
    detail: NeracaItem[];
    total_liabilitas: number;
  };
  ekuitas: {
    detail: NeracaItem[];
    total_ekuitas: number;
  };
  kontrol: {
    total_liabilitas_dan_ekuitas: number;
    selisih: number;
  };
  catatan?: string[];
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount || 0);

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

const Neraca: React.FC = () => {
  const [data, setData] = useState<NeracaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getHeaders = useCallback((): HeadersInit => {
    const token = getStoredToken();
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
    };
  }, []);

  const fetchNeraca = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/super-admin/laporan/neraca`, {
        headers: getHeaders(),
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => null);
        throw new Error(errorJson?.message || 'Gagal mengambil laporan neraca');
      }

      const json: NeracaResponse = await response.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchNeraca();
  }, [fetchNeraca]);

  const renderRows = (items: NeracaItem[]) => (
    <div className="space-y-2">
      {items.length === 0 ? (
        <div className="flex justify-between text-sm text-gray-500">
          <span>Belum ada data</span>
          <span>{formatCurrency(0)}</span>
        </div>
      ) : (
        items.map(item => (
          <div key={item.nama} className="flex justify-between gap-4 text-sm">
            <span className="text-gray-700">{item.nama}</span>
            <span className="font-medium text-gray-900">{formatCurrency(item.total)}</span>
          </div>
        ))
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Neraca</h1>
          <p className="text-sm text-gray-600">
            {data ? `Snapshot per ${formatDate(data.tanggal)}` : 'Laporan posisi keuangan'}
          </p>
        </div>
        <button
          type="button"
          onClick={fetchNeraca}
          className="w-fit rounded bg-orange-600 px-4 py-2 text-sm font-medium text-white"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <section className="rounded-lg border bg-white p-4">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Aset</h2>
              <div className="mb-4">
                <h3 className="mb-2 text-sm font-semibold text-gray-600">Aset Lancar</h3>
                {renderRows(data.aset.lancar)}
                <div className="mt-3 flex justify-between border-t pt-3 text-sm font-semibold">
                  <span>Total Aset Lancar</span>
                  <span>{formatCurrency(data.aset.total_aset_lancar)}</span>
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-600">Aset Tetap</h3>
                {renderRows(data.aset.tetap)}
                <div className="mt-3 flex justify-between border-t pt-3 text-sm font-semibold">
                  <span>Total Aset Tetap</span>
                  <span>{formatCurrency(data.aset.total_aset_tetap)}</span>
                </div>
              </div>
              <div className="mt-4 flex justify-between rounded bg-gray-100 px-3 py-2 font-bold">
                <span>Total Aset</span>
                <span>{formatCurrency(data.aset.total_aset)}</span>
              </div>
            </section>

            <section className="rounded-lg border bg-white p-4">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Liabilitas</h2>
              {renderRows(data.liabilitas.detail)}
              <div className="mt-4 flex justify-between rounded bg-gray-100 px-3 py-2 font-bold">
                <span>Total Liabilitas</span>
                <span>{formatCurrency(data.liabilitas.total_liabilitas)}</span>
              </div>
            </section>

            <section className="rounded-lg border bg-white p-4">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Ekuitas</h2>
              {renderRows(data.ekuitas.detail)}
              <div className="mt-4 flex justify-between rounded bg-gray-100 px-3 py-2 font-bold">
                <span>Total Ekuitas</span>
                <span>{formatCurrency(data.ekuitas.total_ekuitas)}</span>
              </div>
            </section>
          </div>

          <div className="mt-6 rounded-lg border bg-white p-4">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Kontrol Balance</h2>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <p className="text-sm text-gray-500">Total Aset</p>
                <p className="font-semibold">{formatCurrency(data.aset.total_aset)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Liabilitas + Ekuitas</p>
                <p className="font-semibold">{formatCurrency(data.kontrol.total_liabilitas_dan_ekuitas)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Selisih</p>
                <p className="font-semibold">{formatCurrency(data.kontrol.selisih)}</p>
              </div>
            </div>
          </div>

          {data.catatan && data.catatan.length > 0 && (
            <div className="mt-4 rounded-lg border bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-gray-900">Catatan</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
                {data.catatan.map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Neraca;
