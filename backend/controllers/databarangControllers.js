import Barang from "../models/databarang.js";
import Settings from "../models/settings.js";
import db from "../config/firebaseAdmin.js";
import { io } from "../server.js";
import mongoose from "mongoose";
import cloudinary from "../config/cloudinary.js";
import { buildBranchFilter, validateAndInjectBranch } from "../utils/rbacHelper.js";

// Ambil semua barang, menggabungkan stok dari Firebase RTDB jika tersedia
export const getAllBarang = async (req, res) => {
  try {
    const { status, includePending } = req.query;
    let query = {};

    const shouldIncludePending = includePending === "true" || includePending === "1";

    // Default: hanya tampilkan barang yang sudah dipublish untuk endpoint publik/dashboard user.
    // Jika ada request eksplisit untuk includePending, izinkan semua status.
    if (status) {
      query = {
        $or: [
          { status_publish: status },
          { status },
        ],
      };
    } else if (!shouldIncludePending) {
      query = {
        $or: [
          { status_publish: "publish" },
          { status: "publish" },
        ],
      };
    }

    const barang = await Barang.find({ ...buildBranchFilter(req.user), ...query }).lean();

    // get all RTDB barang once
    let stokMap = {};
    if (db) {
      try {
        const snap = await db.ref('/barang').once('value');
        const data = snap.val() || {};
        Object.keys(data).forEach(k => {
          if (data[k] && typeof data[k].stok !== 'undefined') stokMap[k] = data[k].stok;
        });
      } catch (e) {
        console.warn('Failed to read RTDB barang:', e.message);
      }
    }

    const barangWithCalc = barang.map(item => {
      const id = item._id && item._id.toString ? item._id.toString() : item._id;
      const stokFromRTDB = stokMap[id];
      const stok = (typeof stokFromRTDB === 'number') ? stokFromRTDB : item.stok;

      // Calculate stock status
      let statusStok = "aman";
      if (stok === 0) statusStok = "habis";
      else if (stok <= (item.stok_minimal || 5)) statusStok = "hampir habis";
      
      // Get publish status from database
      const statusPublish = item.status_publish || item.status || "pending";

      return {
        ...item,
        stok,
        hargaFinal: Math.round(item.hargaFinal),
        // Return publish status as status field for consistency with admin API
        status: statusPublish,
        status_publish: statusPublish,
        status_stok: item.status_stok || statusStok
      };
    });

    res.json(barangWithCalc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Tambah barang: simpan ke MongoDB lalu set stok awal ke RTDB
export const createBarang = async (req, res) => {
  try {
    // Handle bahan_baku yang dikirim sebagai JSON string dari FormData
    let bodyData = { ...req.body };
    
    // Convert string values to appropriate types
    if (bodyData.use_discount === "true") bodyData.use_discount = true;
    if (bodyData.use_discount === "false") bodyData.use_discount = false;
    
    if (bodyData.stok) bodyData.stok = parseInt(bodyData.stok);
    if (bodyData.stok_minimal) bodyData.stok_minimal = parseInt(bodyData.stok_minimal);
    if (bodyData.harga_beli) bodyData.harga_beli = parseFloat(bodyData.harga_beli);
    if (bodyData.harga_jual) bodyData.harga_jual = parseFloat(bodyData.harga_jual);
    if (bodyData.margin) bodyData.margin = parseFloat(bodyData.margin);

    if (bodyData.bahan_baku && typeof bodyData.bahan_baku === 'string') {
      try {
        bodyData.bahan_baku = JSON.parse(bodyData.bahan_baku);
      } catch (e) {
        console.warn('Failed to parse bahan_baku JSON:', e.message);
        bodyData.bahan_baku = [];
      }
    }

    // Handle gambar upload
    if (req.file) {
      bodyData.gambar_url = `/uploads/${req.file.filename}`;
    }

    const branchValidation = validateAndInjectBranch(req, true);
    if (!branchValidation.isValid) {
      return res.status(403).json({ message: branchValidation.error || "Branch tidak valid" });
    }

    const barang = new Barang(bodyData);
    await barang.save();

    if (db) {
      try {
        await db.ref(`/barang/${barang._id.toString()}`).set({
          stok: barang.stok || 0,
          nama: barang.nama || '',
          harga_jual: barang.harga_jual || 0
        });
      } catch (e) {
        console.warn('Failed to write to RTDB:', e.message);
      }
    }

    res.status(201).json({ message: "Barang berhasil ditambahkan!", barang });
  } catch (error) {
    console.error('Error creating barang:', error);
    res.status(400).json({ message: error.message });
  }
};


// Update barang: update MongoDB and sync relevant fields to RTDB
export const updateBarang = async (req, res) => {
  try {
    let updateData = { ...req.body };

    // Convert string values to appropriate types
    if (updateData.use_discount === "true") updateData.use_discount = true;
    if (updateData.use_discount === "false") updateData.use_discount = false;
    
    if (updateData.stok) updateData.stok = parseInt(updateData.stok);
    if (updateData.stok_minimal) updateData.stok_minimal = parseInt(updateData.stok_minimal);
    if (updateData.harga_beli) updateData.harga_beli = parseFloat(updateData.harga_beli);
    if (updateData.harga_jual) updateData.harga_jual = parseFloat(updateData.harga_jual);
    if (updateData.margin) updateData.margin = parseFloat(updateData.margin);

    // Handle bahan_baku yang dikirim sebagai JSON string dari FormData
    if (updateData.bahan_baku && typeof updateData.bahan_baku === 'string') {
      try {
        updateData.bahan_baku = JSON.parse(updateData.bahan_baku);
      } catch (e) {
        console.warn('Failed to parse bahan_baku JSON:', e.message);
        updateData.bahan_baku = [];
      }
    }

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "barang",
      });
      updateData.gambar_url = result.secure_url;
    }

    const branchValidation = validateAndInjectBranch(req, true);
    if (!branchValidation.isValid) {
      return res.status(403).json({ message: branchValidation.error || "Branch tidak valid" });
    }

    const barang = await Barang.findOneAndUpdate({ _id: req.params.id, ...buildBranchFilter(req.user) }, updateData, { new: true });
    if (!barang) return res.status(404).json({ message: "Barang tidak ditemukan" });

    if (db) {
      try {
        await db.ref(`/barang/${barang._id.toString()}`).update({
          stok: barang.stok || 0,
          nama: barang.nama || '',
          harga_jual: barang.harga_jual || 0
        });
      } catch (e) {
        console.warn('Failed to update RTDB:', e.message);
      }
    }

    res.json({ message: "Barang berhasil diperbarui!", barang });
  } catch (error) {
    console.error('Error updating barang:', error);
    res.status(400).json({ message: error.message });
  }
};


// Hapus barang: hapus dari MongoDB dan RTDB
export const deleteBarang = async (req, res) => {
  try {
    const barang = await Barang.findOneAndDelete({ _id: req.params.id, ...buildBranchFilter(req.user) });
    if (!barang) return res.status(404).json({ message: "Barang tidak ditemukan" });

    if (db) {
      try {
        await db.ref(`/barang/${req.params.id}`).remove();
      } catch (e) {
        console.warn('Failed to remove from RTDB:', e.message);
      }
    }

    res.json({ message: "Barang berhasil dihapus!" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Decrement stock atomically in RTDB (useful when processing a sale)
export const decrementStock = async (req, res) => {
  const { id } = req.params;
  const qty = parseInt(req.body.qty || '1', 10);
  if (!id || isNaN(qty) || qty <= 0) return res.status(400).json({ message: 'Invalid id or qty' });

  if (!db) return res.status(500).json({ message: 'RTDB not initialized' });

  const ref = db.ref(`/barang/${id}/stok`);
  try {
    const result = await ref.transaction(current => {
      if (current === null || typeof current === 'undefined') return current;
      const next = current - qty;
      return next < 0 ? 0 : next;
    });

  if (!result.committed) return res.status(409).json({ message: 'Transaction not committed or stock missing' });

  const newStock = result.snapshot.val();

    // best-effort sync to MongoDB
    try {
      if (mongoose.Types.ObjectId.isValid(id)) {
        await Barang.findByIdAndUpdate(id, { stok: newStock });
      }
    } catch (e) {
      console.warn('Failed to sync MongoDB stock:', e.message);
    }

    // notify connected clients via Socket.IO
    try {
      io.emit('stockUpdated', { id, stok: newStock });
    } catch (e) {
      console.warn('Failed to emit socket update:', e.message);
    }

    res.json({ id, stok: newStock });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update status barang (pending -> publish)
export const updateBarangStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "publish"].includes(status)) {
      return res.status(400).json({ message: "Status tidak valid. Gunakan 'pending' atau 'publish'" });
    }

    // Update both status dan status_publish untuk memastikan konsistensi
    const barang = await Barang.findByIdAndUpdate(
      id, 
      { 
        status, 
        status_publish: status 
      }, 
      { new: true }
    );

    if (!barang) {
      return res.status(404).json({ message: "Barang tidak ditemukan" });
    }

    // Emit socket event untuk update real-time
    io.emit("barang:updated", barang);

    res.json({ 
      message: `Status barang berhasil diubah ke ${status}`, 
      barang 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
