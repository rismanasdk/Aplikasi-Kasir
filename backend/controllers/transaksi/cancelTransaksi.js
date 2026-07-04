import mongoose from "mongoose";
import Transaksi from "../../models/datatransaksi.js";
import Barang from "../../models/databarang.js"; 
import db from "../../config/firebaseAdmin.js";
import { io } from "../../server.js";
import { PERMISSIONS } from "../../../shared/permissionRegistry.js";
import { buildBranchFilter } from "../../utils/rbacHelper.js";


export const cancelTransaksi = async (req, res) => {
  try {
    const { id } = req.params;
    const permissionCodes = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
    const canCancelTransaction = permissionCodes.includes(PERMISSIONS.TRANSACTION_DELETE) || permissionCodes.includes(PERMISSIONS.TRANSACTION_UPDATE);

    const branchFilter = buildBranchFilter(req.user);
    const transaksi = await Transaksi.findOne({ _id: id, ...branchFilter });

    if (!transaksi) {
      return res.status(404).json({ message: "Transaksi tidak ditemukan!" });
    }

    if (transaksi.status === "selesai") {
      return res.status(400).json({ message: "Transaksi yang sudah selesai tidak dapat dibatalkan!" });
    }

    if (transaksi.stok_dikembalikan) {
      return res.status(400).json({ message: "Stok sudah dikembalikan untuk transaksi ini!" });
    }

    // Authorization: allow if user has permission OR owns the transaction
    const isAdmin = canCancelTransaction;
    const isTransactionOwner =
      transaksi.kasir_id === (req.user.username || req.user.id) ||
      String(transaksi.user_id) === String(req.user.id);

    if (!isAdmin && !isTransactionOwner) {
      return res.status(403).json({ message: "Anda tidak diizinkan membatalkan transaksi ini" });
    }

    transaksi.status = "dibatalkan";

    for (const item of transaksi.barang_dibeli) {
      let barang = null;

      if (mongoose.Types.ObjectId.isValid(item.kode_barang)) {
    barang = await Barang.findById(item.kode_barang);
  } else {
    barang = await Barang.findOne({ kode_barang: item.kode_barang });
  }
      if (barang) {
        const jumlah = Number(item.jumlah);
        if (db) {
          try {
            const ref = db.ref(`/barang/${barang._id.toString()}/stok`);
            const trx = await ref.transaction(c => {
              if (c === null || typeof c === "undefined") return jumlah;
              return c + jumlah;
            });

            if (trx.committed) {
              const newStock = trx.snapshot.val();
              // sync to Mongo
              try { await Barang.findByIdAndUpdate(barang._id, { stok: newStock }); } catch (e) { console.warn('Sync Mongo failed:', e.message); }
              console.log(`(Cancel) Stok ${barang.nama_barang} dikembalikan sebanyak ${item.jumlah}, total sekarang: ${newStock}`);
              try { io.emit('stockUpdated', { id: barang._id.toString(), stok: newStock }); } catch (e) { console.warn('Emit failed:', e.message); }
              continue;
            }
          } catch (e) {
            console.warn('RTDB increment failed, falling back to Mongo:', e.message);
          }
        }

        barang.stok = Number(barang.stok) + Number(item.jumlah);
        await barang.save();
        console.log(
          `(Cancel) Stok ${barang.nama_barang} dikembalikan sebanyak ${item.jumlah}, total sekarang: ${barang.stok}`
        );
        try { io.emit('stockUpdated', { id: barang._id.toString(), stok: barang.stok }); } catch (e) { console.warn('Emit failed:', e.message); }
      } else {
        console.warn(
          `Barang dengan _id ${item.kode_barang} tidak ditemukan untuk rollback stok!`
        );
      }
    }

    transaksi.stok_dikembalikan = true;
    await transaksi.save();

    io.emit("statusUpdated", transaksi);

    res.json({
      message: "Transaksi berhasil dibatalkan dan stok dikembalikan!",
      transaksi,
    });
  } catch (err) {
    console.error("Error cancelTransaksi:", err);
    res.status(500).json({ message: err.message });
  }
};
