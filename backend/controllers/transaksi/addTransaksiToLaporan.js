import mongoose from "mongoose";
import Barang from "../models/databarang.js"; 
import Laporan from "../models/datalaporan.js";
import BiayaOperasional from "../models/biayaoperasional.js";

export const addTransaksiToLaporan = async (transaksi) => {
  try {
    const tanggal = transaksi.tanggal_transaksi
      ? new Date(transaksi.tanggal_transaksi)
      : new Date();

    const startBulan = new Date(tanggal.getFullYear(), tanggal.getMonth(), 1, 0, 0, 0, 0);
    const endBulan = new Date(tanggal.getFullYear(), tanggal.getMonth() + 1, 0, 23, 59, 59, 999);

    let laporan = await Laporan.findOne({
      "periode.start": { $lte: tanggal },
      "periode.end": { $gte: tanggal }
    });

    if (!laporan) {
      const semuaBarang = await Barang.find();
      const totalPengeluaran = semuaBarang.reduce((acc, b) => acc + (b.harga_beli * b.stok), 0);

      laporan = new Laporan({
        periode: { start: startBulan, end: endBulan },
        laporan_penjualan: { harian: [], mingguan: [], bulanan: [] },
        laba: { detail: [] },
        rekap_metode_pembayaran: [],
        biaya_operasional_id: null,
        pengeluaran: totalPengeluaran
      });
    }

    const tanggalHarian = tanggal.toISOString().split("T")[0];
    let laporanHarian = laporan.laporan_penjualan.harian.find((h) => {
      if (!h) return false;
      if (h.tanggal instanceof Date) return h.tanggal.toISOString().split("T")[0] === tanggalHarian;
      return String(h.tanggal) === tanggalHarian;
    });

    if (!laporanHarian) {
      laporanHarian = {
        tanggal: tanggalHarian,
        transaksi: [],
        total_harian: 0,
      };
      laporan.laporan_penjualan.harian.push(laporanHarian);
    }

    let totalHargaFix = 0;

    const Barang = (await import('../models/databarang.js')).default;
    transaksi.barang_dibeli = await Promise.all(
      transaksi.barang_dibeli.map(async (barang) => {
        const jumlah = barang.jumlah || 1;

        // Try to use Data-Barang master values first
        let master = null;
        try {
          master = await Barang.findOne({
            $or: [
              (barang.kode_barang ? { kode_barang: barang.kode_barang } : null),
              (barang.nama_barang ? { nama_barang: barang.nama_barang } : null)
            ].filter(Boolean)
          }).lean();
        } catch (e) {
          master = null;
        }

        const harga_produk = master?.harga_jual ?? barang.harga_satuan ?? 0;
        const hpp = master?.harga_beli ?? (typeof barang.harga_beli === 'number' ? barang.harga_beli : 0);
        const harga_final = master?.hargaFinal ?? (typeof barang.harga_final === 'number' ? barang.harga_final : (typeof barang.subtotal === 'number' && jumlah > 0 ? barang.subtotal / jumlah : harga_produk));

        const subtotal_produk = harga_produk * jumlah;
        const subtotal_final = (typeof barang.subtotal === 'number') ? barang.subtotal : harga_final * jumlah;

        totalHargaFix += subtotal_final;

        laporan.laba.detail.push({
          nomor_transaksi: transaksi.nomor_transaksi,
          kode_barang: barang.kode_barang,
          produk: barang.nama_barang,
          hpp,
          harga_produk,
          harga_final,
          jumlah,
          subtotal_produk,
          subtotal_final
        });

        return {
          ...barang,
          harga_satuan: harga_produk,
          subtotal: subtotal_final,
          harga_beli: hpp,
        };
      })
    );

    transaksi.total_harga = totalHargaFix;

    laporanHarian.transaksi.push({
      nomor_transaksi: transaksi.nomor_transaksi,
      total_harga: transaksi.total_harga,
      barang_dibeli: transaksi.barang_dibeli,
      tanggal_transaksi: tanggal,
    });

    laporanHarian.total_harian += transaksi.total_harga;

    const existingRekap = laporan.rekap_metode_pembayaran.find(
      (r) => r.metode === transaksi.metode_pembayaran
    );

    if (existingRekap) {
      existingRekap.total += transaksi.total_harga;
    } else {
      laporan.rekap_metode_pembayaran.push({
        metode: transaksi.metode_pembayaran,
        total: transaksi.total_harga,
      });
    }

    // Do not store derived profit values; reports will compute them dynamically from snapshots.
    await laporan.save();

    console.log("✅ Transaksi berhasil disimpan dan laporan diperbarui");
  } catch (err) {
    console.error("❌ Gagal menambahkan ke laporan:", err);
  }
};
