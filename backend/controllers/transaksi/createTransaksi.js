import Transaksi from "./../../models/datatransaksi.js";
import Barang from "./../../models/databarang.js";
import db from "./../../config/firebaseAdmin.js";
import { io } from "./../../server.js";
import { snap, core } from "./../../config/midtrans.js";
import User from "./../../models/user.js";
import Settings from "./../../models/settings.js";
import { v4 as uuidv4 } from "uuid";
import { pilihKasirRoundRobin } from "./helpers/kasirHelper.js";
import { addTransaksiToLaporan } from "./helpers/laporanHelper.js";
import ModalUtama from "../../models/modalutama.js";
import HppHarian from "../../models/hpptotal.js";
import BiayaLayanan from "../../models/biayalayanan.js";
import BiayaOperasional from "../../models/biayaoperasional.js";
import PengeluaranBiaya from "../../models/pengeluaranbiaya.js";

const updateHppOtomatis = async (barang_dibeli) => {
  const todayString = new Date().toISOString().slice(0, 10);
  console.log(`[HPP] Memulai proses update HPP untuk ${barang_dibeli.length} item.`);

  // Ambil SEMUA data yang dibutuhkan di awal
  const modalUtama = await ModalUtama.findOne();
  const biayaLayanan = await BiayaLayanan.findOne();
  // compute today's pengeluaran total from pengeluaran_biaya
  const today = new Date();
  const startDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23,59,59,999);
  const agg = await PengeluaranBiaya.aggregate([
    { $match: { tanggal: { $gte: startDay, $lte: endDay } } },
    { $group: { _id: null, total: { $sum: "$jumlah" } } }
  ]);
  const biayaOperasionalToday = agg && agg[0] ? agg[0].total : 0;

  if (!modalUtama) {
    console.error("[HPP] ERROR: Data modal utama tidak ditemukan.");
    throw new Error("Data modal utama tidak ditemukan.");
  }
  if (!biayaLayanan) {
    console.error("[HPP] ERROR: Data biaya layanan tidak ditemukan.");
    throw new Error("Data biaya layanan tidak ditemukan.");
  }

  let hppHarian = await HppHarian.findOne({ tanggal: today });
  if (!hppHarian) {
    hppHarian = new HppHarian({
      tanggal: today,
      produk: [],
      total_hpp: 0,
      total_pendapatan: 0,
      total_laba_kotor: 0,
      total_beban: 0, // Inisialisasi
      laba_bersih: 0  // Inisialisasi
    });
    console.log(`[HPP] Membuat dokumen HPP baru untuk tanggal ${today}.`);
  }

  for (const item of barang_dibeli) {
    // ... (logika perulangan untuk memproses item tetap sama) ...
    const produk = modalUtama.bahan_baku.find(
      (p) => p.nama_produk.toLowerCase().trim() === item.nama_barang.toLowerCase().trim()
    );

    if (!produk) {
      console.warn(`[HPP] SKIP: Produk "${item.nama_barang}" tidak ditemukan.`);
      continue;
    }

    const jumlah = Number(item.jumlah);
    const hpp_per_porsi = Number(produk.modal_per_porsi);
    const harga_jual = Number(item.harga_satuan);

    const hpp_total = hpp_per_porsi * jumlah;
    const pendapatan = harga_jual * jumlah;
    const laba_kotor = pendapatan - hpp_total;

    const existing = hppHarian.produk.find(
      (p) => p.nama_produk.toLowerCase().trim() === item.nama_barang.toLowerCase().trim()
    );

    if (existing) {
      existing.jumlah_terjual += jumlah;
      existing.hpp_total += hpp_total;
      existing.pendapatan += pendapatan;
      existing.laba_kotor += laba_kotor;
    } else {
      hppHarian.produk.push({
        nama_produk: item.nama_barang,
        jumlah_terjual: jumlah,
        hpp_per_porsi,
        hpp_total,
        pendapatan,
        laba_kotor,
      });
    }

    hppHarian.total_hpp += hpp_total;
    hppHarian.total_pendapatan += pendapatan;
    hppHarian.total_laba_kotor += laba_kotor;
  }

  // --- TAMBAHKAN LOGIKA INI DI AKHIR SEBELUM SAVE ---
  // Hitung total beban dan laba bersih berdasarkan total yang sudah terakumulasi
  const biayaLayananHariIni = (biayaLayanan.persen / 100) * hppHarian.total_pendapatan;
  const totalBebanHariIni = biayaLayananHariIni + (Number(biayaOperasionalToday) || 0);
  const labaBersihHariIni = hppHarian.total_laba_kotor - totalBebanHariIni;

  hppHarian.total_beban = totalBebanHariIni;
  hppHarian.laba_bersih = labaBersihHariIni;
  // --- SELESAI LOGIKA TAMBAHAN ---

  try {
    await hppHarian.save();
    console.log(`[HPP] SUKSES: HPP Harian berhasil diperbarui (${today})`);
  } catch (error) {
    console.error("[HPP] ERROR: Gagal menyimpan HPP Harian:", error);
  }

  return hppHarian;
};

export const createTransaksi = async (req, res) => {
  try {
    const { barang_dibeli, metode_pembayaran, total_harga } = req.body;
    const grossAmount = Math.round(Number(total_harga));

    const toNumber = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    // Validasi metode pembayaran
    const settings = await Settings.findOne();
    const allowedMethods = settings ? settings.payment_methods.map(pm => pm.method) : ["Tunai"];
    let baseMethod = metode_pembayaran;
    let channel = null;

    const match = metode_pembayaran.match(/^(.*?)\s*\((.*?)\)$/);
    if (match) {
      baseMethod = match[1].trim();
      channel = match[2].trim();
    }

    const selectedMethod = settings?.payment_methods.find(pm => pm.method === baseMethod);
    if (!selectedMethod) {
      return res.status(400).json({
        message: `Metode pembayaran '${baseMethod}' tidak valid. Pilih salah satu dari: ${allowedMethods.join(", ")}`,
      });
    }

    if (channel && selectedMethod.channels.length > 0) {
      const validChannels = selectedMethod.channels.map(c => c.name);
      if (!validChannels.includes(channel)) {
        return res.status(400).json({
          message: `Channel '${channel}' tidak valid untuk ${baseMethod}. Pilih salah satu dari: ${validChannels.join(", ")}`,
        });
      }
    }

    // PINDAHKAN PENGECEKAN KASIR KE SINI (SEBELUM PENGURANGAN STOK)
    let kasirUsername = req.body.kasir_username;
    if (!kasirUsername) {
      try {
        const kasirTerpilih = await pilihKasirRoundRobin();
        kasirUsername = kasirTerpilih?.username || "kasir_default";
      } catch (error) {
        // Jika tidak ada kasir aktif, kembalikan error tanpa mengurangi stok
        return res.status(400).json({ 
          message: "Tidak ada kasir aktif saat ini" 
        });
      }
    } else {
      const kasirData = await User.findOne({ username: kasirUsername, role: "kasir" });
      if (!kasirData) {
        return res.status(400).json({ message: `Kasir '${kasirUsername}' tidak ditemukan atau bukan kasir.` });
      }
    }

    // SEKARANG BARU KURANGI STOK SETELAH PASTI ADA KASIR AKTIF
    for (const item of barang_dibeli) {
      const barang = await Barang.findOne({
        $or: [{ kode_barang: item.kode_barang }, { nama_barang: item.nama_barang }],
      });

      if (!barang) {
        return res.status(404).json({ message: `Barang ${item.nama_barang} tidak ditemukan!` });
      }

      const jumlah = Number(item.jumlah);

      if (db) {
        const ref = db.ref(`/barang/${barang._id.toString()}/stok`);
        const trx = await ref.transaction(current => {
          if (current === null || typeof current === "undefined") return 0;
          if (current < jumlah) return;
          return current - jumlah;
        });

        if (!trx.committed) {
          return res.status(400).json({ message: `Stok ${item.nama_barang} tidak mencukupi!` });
        }

        const newStock = trx.snapshot.val();

        await Barang.findByIdAndUpdate(barang._id, { stok: newStock });

        io.emit("stockUpdated", { id: barang._id.toString(), stok: newStock });
      } else {
        if (barang.stok < jumlah) {
          return res.status(400).json({ message: `Stok ${item.nama_barang} tidak mencukupi!` });
        }
        barang.stok -= jumlah;
        await barang.save();
        io.emit("stockUpdated", { id: barang._id.toString(), stok: barang.stok });
      }
    }

    // Sisanya tetap sama
    const nomorTransaksi = uuidv4();

    const barangFinal = await Promise.all(
      barang_dibeli.map(async (item) => {
        const barangData = await Barang.findOne({
          $or: [
            { _id: item.kode_barang },
            { kode_barang: item.kode_barang },
            { nama_barang: item.nama_barang },
          ],
        });

        if (!barangData) {
          // safety: although we checked stock earlier, guard against missing DB row
          throw new Error(`Barang ${item.nama_barang} tidak ditemukan saat building transaksi`);
        }

        const jumlah = toNumber(item.jumlah);
        const hargaFinal = toNumber(barangData.hargaFinal || barangData.harga_jual || item.harga_satuan);
        const hargaBeli = toNumber(barangData.harga_beli || item.harga_beli || barangData.harga_beli);

        return {
          kode_barang: barangData.kode_barang,
          nama_barang: barangData.nama_barang,
          jumlah,
          harga_satuan: hargaFinal, // ambil dari DB
          harga_beli: hargaBeli,     // ambil dari DB (WAJIB)
          subtotal: jumlah * hargaFinal,
        };
      })
    );

    const transaksi = new Transaksi({
      ...req.body,
      barang_dibeli: barangFinal,
      order_id: nomorTransaksi,
      nomor_transaksi: nomorTransaksi,
      status: baseMethod === "Tunai" ? "selesai" : "pending",
      tanggal_transaksi: new Date(),
      kasir_id: kasirUsername,
      user_id: req.user?.id || null,
    });

    await transaksi.save();
    await updateHppOtomatis(barangFinal);

    if (transaksi.status === "selesai") {
      await addTransaksiToLaporan(transaksi);

      // Tambah omzet ke saldo_kas di ModalUtama
      try {
        const modal = await ModalUtama.findOne();
        if (!modal) {
          const newModal = new ModalUtama({
            total_modal: 0,
            saldo_kas: transaksi.total_harga,
            riwayat: [
              {
                keterangan: `Omzet penjualan: ${transaksi.nomor_transaksi}`,
                tipe: "pemasukan",
                jumlah: transaksi.total_harga,
                saldo_setelah: transaksi.total_harga,
              },
            ],
          });
          await newModal.save();
        } else {
          modal.saldo_kas = (modal.saldo_kas || 0) + (transaksi.total_harga || 0);
          modal.riwayat.push({
            keterangan: `Omzet penjualan: ${transaksi.nomor_transaksi}`,
            tipe: "pemasukan",
            jumlah: transaksi.total_harga,
            saldo_setelah: modal.saldo_kas,
          });
          await modal.save();
        }
      } catch (e) {
        console.warn("Gagal update ModalUtama.saldo_kas dari omzet:", e.message);
      }
    }

    let midtransResponse = {};
    if (baseMethod === "Virtual Account") {
      const bankMapping = {
        bca: "bca",
        bni: "bni",
        bri: "bri",
        permata: "permata",
        "cimb niaga": "cimb",
      };
      const bankCode = bankMapping[channel?.toLowerCase()] || "permata";

      const vaChargeParams = {
        payment_type: "bank_transfer",
        transaction_details: {
          order_id: nomorTransaksi,
          gross_amount: grossAmount,
        },
        bank_transfer: { bank: bankCode },
      };

      const vaTransaction = await core.charge(vaChargeParams);
      transaksi.no_va = vaTransaction.va_numbers?.[0]?.va_number || null;
      transaksi.metode_pembayaran = `Virtual Account (${bankCode.toUpperCase()})`;
      await transaksi.save();
      midtransResponse = vaTransaction;

    } else if (baseMethod === "E-Wallet") {
      const qrisTransaction = await core.charge({
        payment_type: "qris",
        transaction_details: { order_id: nomorTransaksi, gross_amount: grossAmount },
      });
      transaksi.metode_pembayaran = "E-Wallet (QRIS)";
      await transaksi.save();
      midtransResponse = qrisTransaction;

    } else if (baseMethod === "Credit Card") {
      const snapTransaction = await snap.createTransaction({
        transaction_details: { order_id: nomorTransaksi, gross_amount: grossAmount },
        credit_card: { secure: true },
      });
      transaksi.metode_pembayaran = "Credit Card";
      await transaksi.save();
      midtransResponse = snapTransaction;

    } else if (baseMethod === "Tunai") {
      midtransResponse = { status: "success", message: "Pembayaran tunai dicatat" };
    }

    return res.status(201).json({
      message: "Transaksi berhasil dibuat",
      transaksi,
      midtrans: midtransResponse,
    });
  } catch (error) {
    console.error("Error createTransaksi:", error);
    return res.status(400).json({ message: "Gagal membuat transaksi", error: error.message });
  }
};