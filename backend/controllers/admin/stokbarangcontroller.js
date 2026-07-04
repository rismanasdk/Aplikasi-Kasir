// backend/controllers/admin/stokbarangcontroller.js
import Barang from "../../models/databarang.js";
import Settings from "../../models/settings.js";
import db from "../../config/firebaseAdmin.js";
import { io } from "../../server.js";
import mongoose from "mongoose";
import cloudinary from "../../config/cloudinary.js";
import { kurangiModalUtama } from "./utils/updatemodalutama.js";
import Production from "../../models/production.js";
import Transaksi from "./../../models/datatransaksi.js";
import { buildBranchFilter, validateAndInjectBranch } from "../../utils/rbacHelper.js";

// Fungsi helper untuk menghitung status berdasarkan stok
const calculateStatus = (stok, stokMinimal) => {
  // Pastikan stok dan stokMinimal adalah angka yang valid
  const currentStok = typeof stok === 'number' ? stok : parseInt(stok) || 0;
  const minStok = typeof stokMinimal === 'number' ? stokMinimal : parseInt(stokMinimal) || 5;
  
  if (currentStok === 0) return "habis";
  if (currentStok <= minStok) return "hampir habis";
  return "aman";
};

export const getSalesStats = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // ===== AGGREGATION PIPELINE =====
    // 1. Filter transaksi yang selesai dalam periode
    // 2. Unwind array barang_dibeli
    // 3. Group per kode_barang, sum jumlah terjual
    // 4. Lookup ke koleksi Barang untuk dapatkan _id (MongoDB ObjectId)
    // 5. Project hasil akhir
    const salesStats = await Transaksi.aggregate([
      // --- Step 1: Filter transaksi ---
      {
        $match: {
          tanggal_transaksi: { $gte: startDate },
          status: "selesai",
        },
      },

      // --- Step 2: Unwind array barang_dibeli ---
      {
        $unwind: "$barang_dibeli",
      },

      // --- Step 3: Group per kode_barang, hitung total terjual ---
      {
        $group: {
          _id: "$barang_dibeli.kode_barang",
          nama_barang: { $first: "$barang_dibeli.nama_barang" },
          total_sold: { $sum: "$barang_dibeli.jumlah" },
        },
      },

      // --- Step 4: Lookup ke koleksi Barang untuk dapatkan _id ---
      //     Karena frontend memakai Barang._id sebagai key,
      //     tapi Transaksi hanya simpan kode_barang (string)
      {
        $lookup: {
          from: "Data-Barang", // nama koleksi Barang (sesuaikan jika beda)
          localField: "_id",    // kode_barang dari group
          foreignField: "kode_barang",
          as: "barang_info",
        },
      },

      // --- Step 5: Unwrap lookup result & project final ---
      {
        $unwind: {
          path: "$barang_info",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          barang_id: { $toString: "$barang_info._id" },
          nama_barang: 1,
          total_sold: 1,
        },
      },

      // --- Step 6: Sort ascending (paling sedikit dulu) ---
      { $sort: { total_sold: 1 } },
    ]);

    // ===== HANDLE PRODUK YG SUDAH DIHAPUS DARI DB BARANG =====
    // Jika lookup tidak menemukan barang (sudah dihapus),
    // barang_info akan kosong. Filter ini memastikan hanya
    // produk yang masih ada di DB yang dikembalikan.
    const validStats = salesStats.filter(
      (item) => item.barang_id && item.barang_id !== "null" && item.barang_id !== "undefined"
    );

    return res.status(200).json(validStats);
  } catch (error) {
    console.error("Error getSalesStats:", error);
    return res.status(500).json({
      message: "Gagal mengambil data penjualan",
      error: error.message,
    });
  }
};

// Helper global: hitung harga jual berdasarkan TRUE margin
const computeHargaJual = (hb, m) => {
  const hargaBeliNum = Number(hb);
  const marginNum = Number(m);

  if (!isFinite(hargaBeliNum) || hargaBeliNum <= 0) {
    return 0;
  }

  if (!isFinite(marginNum) || marginNum < 0 || marginNum >= 100) {
    throw new Error("Margin tidak valid. Harus >= 0 dan < 100");
  }

  const denom = 1 - (marginNum / 100);

  if (Math.abs(denom) < Number.EPSILON) {
    throw new Error("Margin menyebabkan pembagian dengan nol");
  }

  const harga = hargaBeliNum / denom;

  return Math.round(harga);
};


export const getAllBarang = async (req, res) => {
  try {
    const barangList = await Barang.find(buildBranchFilter(req.user)).lean();
    
    // Ambil pengaturan lowStockAlert
    const settings = await Settings.findOne();
    const lowStockAlert = settings?.lowStockAlert ?? 5;

    let stokMap = {};
    if (db) {
      try {
        const snap = await db.ref("/barang").once("value");
        const data = snap.val() || {};
        Object.keys(data).forEach((k) => {
          if (data[k] && typeof data[k].stok !== "undefined") {
            stokMap[k] = data[k].stok;
          }
        });
      } catch (e) {
        console.warn("⚠️ Gagal ambil stok RTDB:", e.message);
      }
    }

    const barangWithStock = barangList.map((item) => {
      const id = item._id.toString();
      const stokRTDB = stokMap[id];
      const stok = typeof stokRTDB === "number" ? stokRTDB : item.stok;
      const statusStok = calculateStatus(stok, item.stok_minimal || lowStockAlert);
      const statusPublish = item.status_publish || item.status || "pending";
      
      return {
        ...item,
        stok,
        status: statusPublish,
        status_publish: statusPublish,
        status_stok: item.status_stok || statusStok,
        hargaFinal: Math.round(item.hargaFinal),
        use_discount: item.use_discount, // Pastikan use_discount dikembalikan
      };
    });

    res.json(barangWithStock);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Tambah barang baru
export const createBarang = async (req, res) => {
  try {
    const {
      kode_barang,
      nama_barang,
      kategori,
      stok = 1,
      stok_minimal = 0,
      bahan_baku,
      margin,
      use_discount,
    } = req.body;

    if (!kategori) {
      return res.status(400).json({ message: "Kategori wajib diisi." });
    }

    // Perbaikan: Gunakan 35% hanya jika margin tidak diberikan
    const finalMargin = margin !== undefined && !isNaN(parseFloat(margin))
      ? parseFloat(margin)
      : 35; // Default 35% jika tidak ada margin

    const branchValidation = validateAndInjectBranch(req, true);
    if (!branchValidation.isValid) {
      return res.status(403).json({ message: branchValidation.error || "Branch tidak valid" });
    }

    // Parse bahan_baku (kalau dikirim dalam bentuk stringified JSON)
    let bahanParsed = [];
    try {
      bahanParsed =
        typeof bahan_baku === "string" ? JSON.parse(bahan_baku) : bahan_baku;
    } catch (err) {
      bahanParsed = [];
    }

    // Hitung total harga bahan & total porsi
    let totalHargaBahan = 0;
    let totalPorsi = 0;

    if (Array.isArray(bahanParsed)) {
      bahanParsed.forEach((produk) => {
        if (Array.isArray(produk.bahan)) {
          produk.bahan.forEach((b) => {
            totalHargaBahan += b.harga || 0;
            totalPorsi += b.jumlah || 0;
          });
        }
      });
    }

    // Hitung modal per porsi
    const modalPerPorsi = totalPorsi > 0 ? totalHargaBahan / totalPorsi : totalHargaBahan;

    // Harga beli = modal per porsi (ini sudah benar)
    const hargaBeli = modalPerPorsi;

    // Hitung harga jual berdasarkan true margin (gunakan helper global)
    let hargaJual;
    try {
      hargaJual = computeHargaJual(hargaBeli, finalMargin);
    } catch (err) {
      return res.status(400).json({ message: err.message || 'Margin tidak valid' });
    }

    // Ambil pengaturan pajak, diskon, dan biaya layanan dari Settings
    const settings = await Settings.findOne();
    const taxRate = settings?.taxRate ?? 0;
    const globalDiscount = settings?.globalDiscount ?? 0;
    const serviceCharge = settings?.serviceCharge ?? 0;
    const lowStockAlert = settings?.lowStockAlert ?? 5;
    const discountRate = use_discount === "true" || use_discount === true ? globalDiscount : 0;

    // Hitung harga final (harga jual + pajak + biaya - diskon)
    const hargaSetelahDiskon = hargaJual - (hargaJual * discountRate / 100);
    const hargaSetelahPajak = hargaSetelahDiskon + (hargaSetelahDiskon * taxRate / 100);
    const hargaFinal = hargaSetelahPajak + (hargaSetelahPajak * serviceCharge / 100);

    // Upload gambar (kalau ada)
    let gambarUrl = "";
    if (req.file) {
      const upload = await cloudinary.uploader.upload(req.file.path, {
        folder: "barang",
      });
      gambarUrl = upload.secure_url;
    }

    // Hitung status stok untuk Firebase (bukan untuk MongoDB status field)
    const statusStok = calculateStatus(stok, stok_minimal || lowStockAlert);

    // Simpan barang baru
    const barang = new Barang({
      branch_id: req.user?.branch_id,
      kode_barang,
      nama_barang,
      kategori,
      stok,
      stok_minimal,
      bahan_baku: bahanParsed,
      margin: finalMargin, // Gunakan finalMargin
      harga_beli: Math.round(hargaBeli), // Ini sudah modal per porsi
      harga_jual: Math.round(hargaJual),
      hargaFinal: Math.round(hargaFinal),
      total_harga_beli: Math.round(totalHargaBahan), // Ini total harga bahan
      gambar_url: gambarUrl,
      // Tetap set field `status` untuk kompatibilitas lama (publish state),
      // namun tambah `status_publish` (publish state) dan `status_stok` (stock state)
      status: "pending", // Status publish default untuk barang baru (backward compat)
      status_publish: "pending",
      status_stok: statusStok,
      use_discount: use_discount === "true" || use_discount === true
    });

    await barang.save();

    // Kurangi modal utama berdasarkan total bahan yang dipakai
    if (totalHargaBahan > 0) {
      try {
        await kurangiModalUtama(totalHargaBahan, `Pembelian bahan baku untuk ${nama_barang}`);
      } catch (modalError) {
        // Jika modal tidak cukup, hapus barang yang sudah dibuat dan return error
        await Barang.findByIdAndDelete(barang._id);
        return res.status(400).json({ message: modalError.message });
      }
    }

    // Update ke Firebase dengan validasi yang lebih baik
    const id = barang._id.toString();
    if (db) {
      try {
        const firebaseData = {
          stok: barang.stok || 0,
          nama: barang.nama_barang || "",
          harga_jual: barang.harga_jual || 0,
          harga_final: Math.round(hargaFinal) || 0,
          kategori: barang.kategori || "",
          status: statusStok || "aman", // Status stok untuk Firebase
        };
        
        await db.ref(`/barang/${id}`).set(firebaseData);
      } catch (firebaseError) {
        console.error("❌ Error updating Firebase:", firebaseError);
        // Lanjutkan proses meskipun Firebase gagal
      }
    }

    // Emit event ke frontend
    io.emit("barang:created", barang);

    // Response sukses
    res.status(201).json({
      message: "Barang berhasil dibuat!",
      data: barang,
      perhitungan: {
        totalHargaBahan,
        totalPorsi,
        modalPerPorsi,
        hargaBeli,
        margin: `${finalMargin}%`, // Gunakan finalMargin
        hargaJual,
        pajak: `${taxRate}%`,
        diskon: `${discountRate}%`,
        biayaLayanan: `${serviceCharge}%`,
        hargaFinal,
        status: statusStok,
      },
    });
  } catch (error) {
    console.error("❌ Error createBarang:", error);
    res.status(400).json({ message: error.message });
  }
};

export const updateBarang = async (req, res) => {
  try {
    const {
      kode_barang,
      nama_barang,
      kategori,
      stok,
      stok_minimal,
      bahan_baku,
      margin,
      use_discount
    } = req.body;

    // Ambil barang yang mau diperbarui
    const barang = await Barang.findById(req.params.id);
    if (!barang) return res.status(404).json({ message: "Barang tidak ditemukan" });

    // Perbaikan: Gunakan margin yang ada jika tidak ada margin baru
    const finalMargin = margin !== undefined && !isNaN(parseFloat(margin))
      ? parseFloat(margin)
      : barang.margin || 35; // Gunakan margin yang ada atau default 35%
  
    // Parse bahan_baku (kalau dikirim string JSON)
    let bahanParsed = [];
    try {
      bahanParsed =
        typeof bahan_baku === "string" ? JSON.parse(bahan_baku) : bahan_baku;
    } catch (err) {
      bahanParsed = [];
    }

    // Perbaikan: Gunakan bahan_baku yang ada jika tidak ada bahan_baku baru
    if (!bahanParsed || bahanParsed.length === 0) {
      bahanParsed = barang.bahan_baku || [];
    }

    // Hitung ulang total harga bahan untuk disimpan ke total_harga_beli
    const totalHargaBahan = Array.isArray(bahanParsed)
      ? bahanParsed.reduce((total, produk) => {
          const subtotal = Array.isArray(produk.bahan)
            ? produk.bahan.reduce((sum, b) => sum + (Number(b.harga) || 0), 0)
            : 0;

          return total + subtotal;
        }, 0)
      : 0;

    // Perbaikan: Gunakan modal_per_porsi yang sudah ada di database
    // Jangan hitung ulang dari total harga bahan
    let hargaBeli;
    
    // Jika barang memiliki bahan baku, gunakan modal_per_porsi yang sudah ada
    if (barang.bahan_baku && barang.bahan_baku.length > 0) {
      // Gunakan harga_beli yang sudah ada (ini adalah modal_per_porsi)
      hargaBeli = barang.harga_beli;
    } else {
      // Jika tidak ada bahan baku, gunakan harga beli yang ada
      hargaBeli = barang.harga_beli;
    }

    // Harga jual = dihitung dari true margin
    let hargaJual;
    try {
      hargaJual = computeHargaJual(hargaBeli, finalMargin);
    } catch (err) {
      return res.status(400).json({ message: err.message || 'Margin tidak valid' });
    }

    // Ambil setting global (pajak, diskon, service)
    const settings = await Settings.findOne();
    const taxRate = settings?.taxRate ?? 0;
    const globalDiscount = settings?.globalDiscount ?? 0;
    const serviceCharge = settings?.serviceCharge ?? 0;
    const lowStockAlert = settings?.lowStockAlert ?? 5;
    
    // Perbaikan: Gunakan discountRate yang sudah memperhitungkan use_discount
    const discountRate = use_discount === "true" || use_discount === true ? globalDiscount : 0;

    // Perbaikan: Gunakan discountRate, bukan globalDiscount
    const hargaSetelahDiskon = hargaJual - (hargaJual * discountRate / 100);
    const hargaSetelahPajak = hargaSetelahDiskon + (hargaSetelahDiskon * taxRate / 100);
    const hargaFinal = hargaSetelahPajak + (hargaSetelahPajak * serviceCharge / 100);

    // Upload gambar (kalau ada)
    let gambarUrl = barang.gambar_url;
    if (req.file) {
      const upload = await cloudinary.uploader.upload(req.file.path, {
        folder: "barang",
      });
      gambarUrl = upload.secure_url;
    }

    // Hitung status di backend dengan validasi yang lebih baik
    const currentStok = stok !== undefined ? stok : barang.stok;
    const currentStokMinimal = stok_minimal !== undefined ? stok_minimal : barang.stok_minimal;
    const statusStok = calculateStatus(currentStok, currentStokMinimal || lowStockAlert);

    // Update data barang
    barang.kode_barang = kode_barang || barang.kode_barang;
    barang.nama_barang = nama_barang || barang.nama_barang;
    barang.kategori = kategori || barang.kategori;
    barang.stok = stok !== undefined ? stok : barang.stok;
    barang.stok_minimal = stok_minimal !== undefined ? stok_minimal : barang.stok_minimal;
    barang.bahan_baku = bahanParsed.length ? bahanParsed : barang.bahan_baku;
    barang.margin = finalMargin; // Gunakan finalMargin
    barang.harga_beli = Math.round(hargaBeli); // Gunakan hargaBeli yang sudah ada di database
    barang.harga_jual = Math.round(hargaJual);
    barang.hargaFinal = Math.round(hargaFinal);
    if (bahanParsed.length) {
      barang.total_harga_beli = Math.round(totalHargaBahan);
    }
    // Update stock status field separately; jangan overwrite publish status.
    barang.status_stok = statusStok;
    barang.gambar_url = gambarUrl;
    // JANGAN update field status dengan status stok! Field status untuk publish/pending
    // barang.status = statusStok; // <-- BARIS INI DIHAPUS
    barang.use_discount = use_discount === "true" || use_discount === true

    await barang.save();

    // Update ke Firebase dengan validasi yang lebih baik
    const id = barang._id.toString();
    if (db) {
      try {
        const firebaseData = {
          stok: barang.stok || 0,
          nama: barang.nama_barang || "",
          harga_jual: barang.harga_jual || 0,
          harga_final: Math.round(hargaFinal) || 0,
          kategori: barang.kategori || "",
          status: statusStok || "aman", // Status stok untuk Firebase
        };
        
        await db.ref(`/barang/${id}`).update(firebaseData);
      } catch (firebaseError) {
        console.error("❌ Error updating Firebase:", firebaseError);
        // Lanjutkan proses meskipun Firebase gagal
      }
    }

    // Emit event ke frontend
    io.emit("barang:updated", barang);

    // Response sukses
    res.json({
      message: "Barang berhasil diperbarui!",
      data: barang,
      perhitungan: {
        hargaBeli,
        margin: `${finalMargin}%`, // Gunakan finalMargin
        hargaJual,
        pajak: `${taxRate}%`,
        diskon: `${discountRate}%`, // Gunakan discountRate, bukan globalDiscount
        biayaLayanan: `${serviceCharge}%`,
        hargaFinal,
      },
    });
  } catch (error) {
    console.error("❌ Error updateBarang:", error);
    res.status(400).json({ message: error.message });
  }
};
// Hapus barang
export const deleteBarang = async (req, res) => {
  try {
    const barang = await Barang.findByIdAndDelete(req.params.id);
    if (!barang) return res.status(404).json({ message: "Barang tidak ditemukan" });

    if (db) {
      try {
        await db.ref(`/barang/${req.params.id}`).remove();
      } catch (firebaseError) {
        console.error("❌ Error deleting from Firebase:", firebaseError);
        // Lanjutkan proses meskipun Firebase gagal
      }
    }
    
    io.emit("barang:deleted", { id: req.params.id, nama: barang.nama_barang });
    
    res.json({ message: "Barang berhasil dihapus!" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Kurangi stok (atomic via RTDB)
export const decrementStock = async (req, res) => {
  const { id } = req.params;
  const qty = parseInt(req.body.qty || "1", 10);
  if (!id || isNaN(qty) || qty <= 0)
    return res.status(400).json({ message: "Invalid id or qty" });

  try {
    // Ambil data barang untuk mendapatkan stok_minimal
    const barang = await Barang.findById(id);
    if (!barang) return res.status(404).json({ message: "Barang tidak ditemukan" });
    
    // Ambil pengaturan lowStockAlert
    const settings = await Settings.findOne();
    const lowStockAlert = settings?.lowStockAlert ?? 5;

    const ref = db.ref(`/barang/${id}/stok`);
    const trx = await ref.transaction((cur) => {
      if (cur === null) return 0;
      return Math.max(0, cur - qty);
    });

    if (!trx.committed)
      return res.status(409).json({ message: "Transaksi stok gagal" });

    const newStock = trx.snapshot.val();
    
    // Hitung status di backend dengan validasi yang lebih baik
    const status = calculateStatus(newStock, barang.stok_minimal || lowStockAlert);
    
    // Update hanya stok dan status_stok (pisahkan dari field publish)
    await Barang.findByIdAndUpdate(id, { 
      stok: newStock,
      status_stok: status // Update status_stok yang sudah dihitung
    });
    
    // Update status di Firebase dengan validasi yang lebih baik
    if (db) {
      try {
        await db.ref(`/barang/${id}`).update({
          stok: newStock,
          status: status || "aman" // Pastikan status tidak undefined
        });
      } catch (firebaseError) {
        console.error("❌ Error updating Firebase stock:", firebaseError);
        // Lanjutkan proses meskipun Firebase gagal
      }
    }
    
    // Emit event ke frontend dengan status yang sudah dihitung
    io.emit("stockUpdated", { id, stok: newStock, status });

    res.json({ id, stok: newStock, status });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create production for chef
export const createProduction = async (req, res) => {
  try {
    const { bahan_baku, produk_jadi, chef_id } = req.body;

    if (!bahan_baku || !produk_jadi || !chef_id) {
      return res.status(400).json({ message: "Bahan baku, produk jadi, dan chef_id wajib diisi" });
    }

    const production = new Production({
      bahan_baku,
      produk_jadi,
      chef_id,
    });

    await production.save();
    res.json({ message: "Produksi berhasil dibuat", production });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all productions for admin
export const getAllProductions = async (req, res) => {
  try {
    const productions = await Production.find()
      .populate("chef_id", "nama_lengkap username")
      .populate("bahan_baku_id", "nama kategori satuan")
      .sort({ createdAt: -1 });
    res.json(productions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Publish barang dari pending ke active (untuk dashboard users)
export const publishBarang = async (req, res) => {
  try {
    const { productionId, chefId } = req.body;

    if (!productionId || !chefId) {
      return res.status(400).json({ message: "productionId dan chefId wajib diisi" });
    }

    // Cari production untuk mendapatkan informasi bahan baku
    const production = await Production.findById(productionId).populate('bahan_baku_id');
    if (!production) {
      return res.status(404).json({ message: "Produksi tidak ditemukan" });
    }

    // Cari barang yang dibuat oleh chef ini dengan status pending
    // Kita cari berdasarkan chef_id dan status pending, dan nama_barang yang match dengan bahan baku
    const barangPending = await Barang.findOne({
      'bahan_baku.nama_produk': production.bahan_baku_id?.nama,
      status: 'pending'
    }).sort({ createdAt: -1 }); // Ambil yang terbaru

    if (!barangPending) {
      return res.status(404).json({ message: "Barang pending tidak ditemukan" });
    }

    // Update status barang menjadi active
    barangPending.status = 'active';
    barangPending.updatedAt = new Date();
    await barangPending.save();

    // Update status production menjadi completed
    production.status = 'completed';
    await production.save();

    res.json({
      message: "Barang berhasil dipublish ke dashboard users",
      barang: barangPending
    });

  } catch (error) {
    console.error('Error publishing barang:', error);
    res.status(500).json({ message: error.message });
  }
};

