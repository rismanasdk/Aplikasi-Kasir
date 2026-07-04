import Transaksi from "./../../models/datatransaksi.js";
import Barang from "./../../models/databarang.js";
import { snap, core } from "./../../config/midtrans.js";
import User from "./../../models/user.js";
import Settings from "./../../models/settings.js";
import { v4 as uuidv4 } from "uuid";
import { pilihKasirRoundRobin } from "./helpers/kasirHelper.js";
import {
  processCompletedTransaction,
  reserveStockForItems,
  restoreStockForItems,
} from "./helpers/transactionLifecycleHelper.js";
import { PERMISSIONS } from "../../../shared/permissionRegistry.js";

export const createTransaksi = async (req, res) => {
  let createdTransaksi = null;
  let reservedItems = [];

  try {
    const permissionCodes = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
    const canCreateTransaction = permissionCodes.includes(PERMISSIONS.TRANSACTION_CREATE);

    if (!req.user || !canCreateTransaction) {
      return res.status(403).json({ message: "Anda tidak diizinkan membuat transaksi" });
    }

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
    let kasirUsername = req.body.kasir_username || req.body.kasir_id;
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
      // Query kasir by username (not by role name)
      const kasirData = await User.findOne({ username: kasirUsername });
      if (!kasirData) {
        return res.status(400).json({ message: `Kasir '${kasirUsername}' tidak ditemukan.` });
      }
    }

    await reserveStockForItems(barang_dibeli);
    reservedItems = barang_dibeli;

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
      user_id: req.user.id,
    });

    await transaksi.save();
    createdTransaksi = transaksi;

    if (transaksi.status === "selesai") {
      await processCompletedTransaction(transaksi);
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
    if (createdTransaksi && createdTransaksi.status !== "selesai") {
      try {
        await createdTransaksi.deleteOne();
      } catch (cleanupError) {
        console.warn("Gagal membersihkan transaksi gagal:", cleanupError.message);
      }
    }

    if (reservedItems.length > 0) {
      try {
        await restoreStockForItems(reservedItems);
      } catch (rollbackError) {
        console.error("Rollback stok gagal setelah createTransaksi error:", rollbackError);
      }
    }

    return res.status(400).json({ message: "Gagal membuat transaksi", error: error.message });
  }
};
