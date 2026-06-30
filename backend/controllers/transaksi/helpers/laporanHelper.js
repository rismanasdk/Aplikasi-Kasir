// backend/controllers/transaksi/helpers/laporanHelper.js

import mongoose from "mongoose";
import Laporan from "../../../models/datalaporan.js";
import Barang from "../../../models/databarang.js";
import BiayaOperasional from "../../../models/biayaoperasional.js";
import ModalUtama from "../../../models/modalutama.js";
import BiRingkasan from "../../../models/biRingkasan.js";
import Settings from "../../../models/settings.js";

const getOmzetKeterangan = (nomorTransaksi) => `Omzet penjualan: ${nomorTransaksi}`;

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
        // store immutable snapshots in laba.detail; do NOT store derived profit values
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

    const alreadyRecorded = laporanHarian.transaksi.some(
      (item) => item?.nomor_transaksi === transaksi.nomor_transaksi
    );

    if (alreadyRecorded) {
      console.log(`ℹ️ Transaksi ${transaksi.nomor_transaksi} sudah pernah masuk laporan, skip duplikasi`);
      return false;
    }

    let totalHargaFix = 0;

    // Do not read product master during laporan creation. Use snapshot values available in transaksi.
    const BarangModel = (await import('../../../models/databarang.js')).default;
    transaksi.barang_dibeli = await Promise.all(
      transaksi.barang_dibeli.map(async (barang) => {
        const jumlah = barang.jumlah || 1;

        // Try to read product master to get canonical prices
        let master = null;
        try {
          master = await BarangModel.findOne({
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

    // Compute totals dynamically when reporting; do not store derived profit values in DB.
    // Still save the laporan document (with snapshot details) so reports can be computed later.
    await laporan.save();

    console.log("✅ Transaksi berhasil disimpan dan laporan diperbarui");
    return true;
  } catch (err) {
    console.error("❌ Gagal menambahkan ke laporan:", err);
    return false;
  }
};

export const addOmzetToModalUtama = async (transaksi) => {
  try {
    const keterangan = getOmzetKeterangan(transaksi.nomor_transaksi);
    const modal = await ModalUtama.findOne();

    if (!modal) {
      const newModal = new ModalUtama({
        total_modal: 0,
        saldo_kas: transaksi.total_harga,
        riwayat: [
          {
            keterangan,
            tipe: "pemasukan",
            jumlah: transaksi.total_harga,
            saldo_setelah: transaksi.total_harga,
          },
        ],
      });
      await newModal.save();
      return true;
    }

    const alreadyRecorded = (modal.riwayat || []).some(
      (item) => item?.tipe === "pemasukan" && item?.keterangan === keterangan
    );

    if (alreadyRecorded) {
      console.log(`ℹ️ Omzet ${transaksi.nomor_transaksi} sudah pernah masuk saldo kas, skip duplikasi`);
      return false;
    }

    modal.saldo_kas = (modal.saldo_kas || 0) + (transaksi.total_harga || 0);
    modal.riwayat.push({
      keterangan,
      tipe: "pemasukan",
      jumlah: transaksi.total_harga,
      saldo_setelah: modal.saldo_kas,
    });
    await modal.save();
    return true;
  } catch (err) {
    console.warn("Gagal update ModalUtama.saldo_kas dari omzet:", err.message);
    return false;
  }
};

export const persistBiRingkasanSnapshot = async (transaksi) => {
  try {
    const date = transaksi?.tanggal_transaksi ? new Date(transaksi.tanggal_transaksi) : new Date();
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
    const settingsDoc = await Settings.findOne();
    console.log("settingsDoc:", settingsDoc); // cek di sini dulu
    console.log("DEBUG target dari settings:", settingsDoc?.targetOmzetBulanan);
    const target = settingsDoc?.targetOmzetBulanan ?? 0;
    console.log("target:", target);
    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    const params = new URLSearchParams({
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    });

    const targetUrl = `${aiServiceUrl}/bi/ringkasan?${params}`;
    const response = await fetch(targetUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`AI service error ${response.status}: ${text}`);
    }

    const payload = await response.json();
    const doc = await BiRingkasan.findOneAndUpdate(
      { key: "latest" },
      {
        $set: {
          key: "latest",
          periode: { start, end },
          source: `ai-service:${aiServiceUrl}`,
          payload,
          pendapatan: (payload && payload.summary && payload.summary.pendapatan) || 0,
          hpp: (payload && payload.summary && payload.summary.hpp) || 0,
          laba_kotor: (payload && payload.summary && payload.summary.laba_kotor) || 0,
          laba_bersih: (payload && payload.summary && payload.summary.laba_bersih) || 0,
          total_pengeluaran: (payload && payload.pengeluaran && payload.pengeluaran.total) || 0,
          target,
          target_progress_pct: (payload && payload.summary && payload.summary.target_progress_pct) || 0,
          metode_pembayaran: (payload && payload.metode_pembayaran) || [],
          top_produk: (payload && payload.produk && payload.produk.top) || [],
          bottom_produk: (payload && payload.produk && payload.produk.bottom) || [],
          cashflow: (payload && payload.cashflow) || {},
          stock: (payload && payload.persediaan && payload.persediaan.stock) || {},
          inventory_value: (payload && payload.persediaan && payload.persediaan.inventory_value) || 0,
          aset_tetap: (payload && payload.aset_tetap && payload.aset_tetap.items) || [],
          narrative: (payload && payload.narrative) || "",
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return doc;
  } catch (error) {
    console.warn("Gagal menyimpan snapshot bi-ringkasan setelah transaksi selesai:", error.message);
    return null;
  }
};

export const syncCompletedTransaction = async (transaksi) => {
  await addTransaksiToLaporan(transaksi);
  await addOmzetToModalUtama(transaksi);
  await persistBiRingkasanSnapshot(transaksi);
};
