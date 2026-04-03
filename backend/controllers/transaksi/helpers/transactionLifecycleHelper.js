import mongoose from "mongoose";
import Barang from "../../../models/databarang.js";
import ModalUtama from "../../../models/modalutama.js";
import HppHarian from "../../../models/hpptotal.js";
import BiayaLayanan from "../../../models/biayalayanan.js";
import PengeluaranBiaya from "../../../models/pengeluaranbiaya.js";
import db from "../../../config/firebaseAdmin.js";
import { io } from "../../../server.js";
import { syncCompletedTransaction } from "./laporanHelper.js";

const findBarangForItem = async (item) => {
  if (item?._id && mongoose.Types.ObjectId.isValid(item._id)) {
    const byId = await Barang.findById(item._id);
    if (byId) return byId;
  }

  if (item?.kode_barang && mongoose.Types.ObjectId.isValid(item.kode_barang)) {
    const byObjectId = await Barang.findById(item.kode_barang);
    if (byObjectId) return byObjectId;
  }

  return Barang.findOne({
    $or: [
      item?.kode_barang ? { kode_barang: item.kode_barang } : null,
      item?.nama_barang ? { nama_barang: item.nama_barang } : null,
    ].filter(Boolean),
  });
};

export const reserveStockForItems = async (items = []) => {
  for (const item of items) {
    const barang = await findBarangForItem(item);

    if (!barang) {
      throw new Error(`Barang ${item?.nama_barang || item?.kode_barang || "-"} tidak ditemukan!`);
    }

    const jumlah = Number(item?.jumlah);
    if (!Number.isFinite(jumlah) || jumlah <= 0) {
      throw new Error(`Jumlah untuk ${barang.nama_barang} tidak valid`);
    }

    if (db) {
      const ref = db.ref(`/barang/${barang._id.toString()}/stok`);
      const trx = await ref.transaction((current) => {
        if (current === null || typeof current === "undefined") return 0;
        if (current < jumlah) return;
        return current - jumlah;
      });

      if (!trx.committed) {
        throw new Error(`Stok ${barang.nama_barang} tidak mencukupi!`);
      }

      const newStock = trx.snapshot.val();
      await Barang.findByIdAndUpdate(barang._id, { stok: newStock });
      io.emit("stockUpdated", { id: barang._id.toString(), stok: newStock });
      continue;
    }

    if (barang.stok < jumlah) {
      throw new Error(`Stok ${barang.nama_barang} tidak mencukupi!`);
    }

    barang.stok -= jumlah;
    await barang.save();
    io.emit("stockUpdated", { id: barang._id.toString(), stok: barang.stok });
  }
};

export const restoreStockForItems = async (items = []) => {
  for (const item of items) {
    const barang = await findBarangForItem(item);
    if (!barang) {
      console.warn(`Rollback stok skip: barang tidak ditemukan untuk ${item?.kode_barang || item?.nama_barang}`);
      continue;
    }

    const jumlah = Number(item?.jumlah);
    if (!Number.isFinite(jumlah) || jumlah <= 0) {
      continue;
    }

    if (db) {
      try {
        const ref = db.ref(`/barang/${barang._id.toString()}/stok`);
        const trx = await ref.transaction((current) => {
          if (current === null || typeof current === "undefined") return jumlah;
          return current + jumlah;
        });

        if (trx.committed) {
          const newStock = trx.snapshot.val();
          await Barang.findByIdAndUpdate(barang._id, { stok: newStock });
          io.emit("stockUpdated", { id: barang._id.toString(), stok: newStock });
          continue;
        }
      } catch (error) {
        console.warn("Rollback RTDB gagal, fallback ke Mongo:", error.message);
      }
    }

    barang.stok = Number(barang.stok) + jumlah;
    await barang.save();
    io.emit("stockUpdated", { id: barang._id.toString(), stok: barang.stok });
  }
};

export const updateHppOtomatis = async (barangDibeli = []) => {
  const today = new Date();
  const todayString = today.toISOString().slice(0, 10);

  const modalUtama = await ModalUtama.findOne();
  const biayaLayanan = await BiayaLayanan.findOne();
  const startDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
  const agg = await PengeluaranBiaya.aggregate([
    { $match: { tanggal: { $gte: startDay, $lte: endDay } } },
    { $group: { _id: null, total: { $sum: "$jumlah" } } },
  ]);
  const biayaOperasionalToday = agg?.[0]?.total || 0;

  if (!modalUtama) {
    throw new Error("Data modal utama tidak ditemukan.");
  }

  if (!biayaLayanan) {
    throw new Error("Data biaya layanan tidak ditemukan.");
  }

  let hppHarian = await HppHarian.findOne({ tanggal: todayString });
  if (!hppHarian) {
    hppHarian = new HppHarian({
      tanggal: todayString,
      produk: [],
      total_hpp: 0,
      total_pendapatan: 0,
      total_laba_kotor: 0,
      total_beban: 0,
      laba_bersih: 0,
    });
  }

  for (const item of barangDibeli) {
    const produk = modalUtama.bahan_baku.find(
      (p) => p.nama_produk.toLowerCase().trim() === item.nama_barang.toLowerCase().trim()
    );

    if (!produk) {
      console.warn(`[HPP] SKIP: Produk "${item.nama_barang}" tidak ditemukan.`);
      continue;
    }

    const jumlah = Number(item.jumlah);
    const hppPerPorsi = Number(produk.modal_per_porsi);
    const hargaJual = Number(item.harga_satuan);
    const hppTotal = hppPerPorsi * jumlah;
    const pendapatan = hargaJual * jumlah;
    const labaKotor = pendapatan - hppTotal;

    const existing = hppHarian.produk.find(
      (p) => p.nama_produk.toLowerCase().trim() === item.nama_barang.toLowerCase().trim()
    );

    if (existing) {
      existing.jumlah_terjual += jumlah;
      existing.hpp_total += hppTotal;
      existing.pendapatan += pendapatan;
      existing.laba_kotor += labaKotor;
    } else {
      hppHarian.produk.push({
        nama_produk: item.nama_barang,
        jumlah_terjual: jumlah,
        hpp_per_porsi: hppPerPorsi,
        hpp_total: hppTotal,
        pendapatan,
        laba_kotor: labaKotor,
      });
    }

    hppHarian.total_hpp += hppTotal;
    hppHarian.total_pendapatan += pendapatan;
    hppHarian.total_laba_kotor += labaKotor;
  }

  const biayaLayananHariIni = (biayaLayanan.persen / 100) * hppHarian.total_pendapatan;
  const totalBebanHariIni = biayaLayananHariIni + (Number(biayaOperasionalToday) || 0);

  hppHarian.total_beban = totalBebanHariIni;
  hppHarian.laba_bersih = hppHarian.total_laba_kotor - totalBebanHariIni;

  await hppHarian.save();
  return hppHarian;
};

export const processCompletedTransaction = async (transaksi) => {
  if (transaksi.completion_processed) {
    return false;
  }

  await updateHppOtomatis(transaksi.barang_dibeli || []);
  await syncCompletedTransaction(transaksi);
  transaksi.completion_processed = true;
  await transaksi.save();
  return true;
};
