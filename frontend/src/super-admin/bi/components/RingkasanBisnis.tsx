import React, { useEffect, useState } from 'react';
import { getRingkasan } from '../biApi';
import { BISection, StatCard, NarasiBox, SimpleBar, DataTable, rp, Skeleton } from './SharedComponents';

export default function RingkasanBisnis() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getRingkasan().then(r => { setData(r.data); setLoading(false); }); }, []);

  if (loading) return <Skeleton rows={5} />;
  if (!data) return <NarasiBox text="Tidak ada data." type="warning" />;

  // Normalize data: prefer frontend-shaped fields, fallback to legacy keys
  const insight = data.insight || { text: data.insight_text || '', type: 'info' };
  const pendapatan = data.pendapatan || { total: data.total_pendapatan || 0, vs_periode_lalu_pct: data.pertumbuhan_vs_periode_lalu_persen || 0 };
  const laba = data.laba_bersih_estimasi || { total: data.total_laba_bersih || 0, margin_pct: data.laba_bersih_margin_persen || 0 };
  const transaksi = data.transaksi || { jumlah: data.total_transaksi || 0, rata_nilai: data.rata_rata_transaksi || 0 };
  const target = data.target || { omzet: data.target_omzet || 0, pencapaian_pct: data.pencapaian_target_persen || 0 };

  const metodeList = data.metode_pembayaran || [];
  const maxMetode = Math.max(...(metodeList || []).map((m: any) => m.total), 1);

  return (
    <div className="space-y-5">
      <NarasiBox 
        text={insight.text} 
        type={insight.type} 
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Pendapatan" 
          value={rp(pendapatan.total)} 
          trend={pendapatan.vs_periode_lalu_pct} 
          color="blue" 
        />
        <StatCard 
          label="Laba Bersih" 
          value={rp(laba.total)} 
          color={laba.total >= 0 ? 'green' : 'red'} 
        />
        <StatCard 
          label="Transaksi" 
          value={`${transaksi.jumlah}`} 
          sub={`Rata-rata ${rp(transaksi.rata_nilai)}/trx`} 
          color="purple" 
        />
        <StatCard 
          label="Target Omzet" 
          value={rp(target.omzet)} 
          sub={`Pencapaian ${target.pencapaian_pct}%`} 
          color="amber" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <BISection title="Pencapaian Target">
          <div className="mb-2 flex justify-between text-sm">
            <span>Target Omzet</span>
            <span className="font-semibold">{target.pencapaian_pct}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all ${target.pencapaian_pct >= 100 ? 'bg-emerald-500' : target.pencapaian_pct >= 60 ? 'bg-blue-500' : 'bg-amber-500'}`}
              style={{ width: `${Math.min(target.pencapaian_pct, 100)}%` }} 
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Target: {rp(target.omzet)} | Margin Bersih: {laba.margin_pct}%
          </p>
        </BISection>

        <BISection title="Metode Pembayaran">
          {(metodeList || []).length > 0 ? metodeList.map((m: any, i: number) => (
            <SimpleBar key={i} label={m.metode || m.metode_pembayaran || m.nama} value={m.total || m.total || 0} max={maxMetode} color={i === 0 ? 'bg-blue-500' : 'bg-blue-300'} />
          )) : <p className="text-sm text-gray-400">Tidak ada data</p>}
        </BISection>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <BISection title="Top 5 Produk (Pendapatan)">
          <DataTable headers={['Produk', 'Qty', 'Pendapatan', 'Laba', 'Margin']} rows={
            (data.top_produk || []).map((p: any) => [
              p.nama_barang || p.nama_produk || p.nama,
              p.jumlah_terjual,
              rp(p.pendapatan),
              rp(p.laba_kotor || p.laba),
              `${p.margin_persen}%`
            ])
          } />
        </BISection>

        <BISection title="Produk Terendah">
          <DataTable headers={['Produk', 'Qty', 'Pendapatan', 'Laba']} rows={
            (data.bottom_produk || []).map((p: any) => [
              p.nama_barang || p.nama_produk || p.nama,
              p.jumlah_terjual,
              rp(p.pendapatan),
              rp(p.laba_kotor || p.laba)
            ])
          } />
        </BISection>
      </div>
    </div>
  );
}