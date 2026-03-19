// backend/controllers/transaksi/helpers/midtransHelper.js

import Transaksi from "../../../models/datatransaksi.js";
import Barang from "../../../models/databarang.js";
import db from "../../../config/firebaseAdmin.js";
import { io } from "../../../server.js";
import { addTransaksiToLaporan } from "./laporanHelper.js";
import ModalUtama from "../../../models/modalutama.js";
import crypto from "crypto";

function mapMidtransToSettings(notification) {
  if (notification.va_numbers && notification.va_numbers.length > 0) {
    const bank = notification.va_numbers[0].bank.toUpperCase();
    return { method: "Virtual Account", channel: bank };
  }

  switch (notification.payment_type) {
    case "credit_card":
      return { method: "Kartu Kredit", channel: notification.card_type || "Visa/MasterCard" };
    case "bank_transfer":
      return { method: "Transfer Bank", channel: (notification.bank || "").toUpperCase() };
    case "echannel":
      return { method: "Virtual Account", channel: "Mandiri" };
    case "gopay":
      return { method: "E-Wallet", channel: "Gopay" };
    case "shopeepay":
      return { method: "E-Wallet", channel: "ShopeePay" };
    case "qris":
      const acquirer = (notification.acquirer || "").toLowerCase();
      if (acquirer.includes("dana")) return { method: "E-Wallet", channel: "Dana" };
      if (acquirer.includes("ovo")) return { method: "E-Wallet", channel: "Ovo" };
      if (acquirer.includes("linkaja")) return { method: "E-Wallet", channel: "LinkAja" };
      if (acquirer.includes("shopeepay")) return { method: "E-Wallet", channel: "ShopeePay" };
      return { method: "QRIS", channel: null };
    case "cstore":
      return { method: "Tunai", channel: notification.store || "Alfamart/Indomaret" };
    default:
      return { method: notification.payment_type, channel: null };
  }
}

export const midtransCallback = async (req, res) => {
  try {
    const notification = req.body;
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const { order_id, status_code, gross_amount, signature_key } = notification;

    if (!serverKey) {
      return res.status(500).json({ message: "MIDTRANS_SERVER_KEY belum diatur" });
    }

    if (!order_id || !status_code || !gross_amount || !signature_key) {
      return res.status(400).json({ message: "Payload callback Midtrans tidak lengkap" });
    }

    const expectedSignature = crypto
      .createHash("sha512")
      .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
      .digest("hex");

    if (signature_key !== expectedSignature) {
      return res.status(403).json({ message: "Signature Midtrans tidak valid" });
    }

    const orderId = notification.order_id;
    const transactionStatus = notification.transaction_status;
    const fraudStatus = notification.fraud_status;

    let status = "pending";
    if (transactionStatus === "capture") {
      status = fraudStatus === "accept" ? "selesai" : "pending";
    } else if (transactionStatus === "settlement") {
      status = "selesai";
    } else if (transactionStatus === "cancel" || transactionStatus === "deny") {
      status = "dibatalkan";
    } else if (transactionStatus === "expire") {
      status = "expire";
    } else if (transactionStatus === "pending") {
      status = "pending";
    }

    const transaksi = await Transaksi.findOne({ order_id: notification.order_id });
    if (!transaksi) {
      console.warn(`Transaksi dengan order_id ${orderId} tidak ditemukan, simpan ke log untuk cek ulang!`);
      return res.json({ message: "Callback diterima, transaksi belum ada" });
    }

    console.log("Order ID dari Midtrans:", notification.order_id);
    console.log("Transaksi ditemukan:", transaksi);

    transaksi.status = status;

    if (!transaksi.metode_pembayaran || transaksi.metode_pembayaran === "Transfer Bank") {
      const mapping = mapMidtransToSettings(notification);
      if (mapping.channel) {
        transaksi.metode_pembayaran = `${mapping.method} (${mapping.channel})`;
      } else {
        transaksi.metode_pembayaran = mapping.method;
      }
    }

    if (notification.va_numbers && notification.va_numbers.length > 0) {
      transaksi.no_va = notification.va_numbers[0].va_number;
      transaksi.bank = notification.va_numbers[0].bank.toUpperCase();
    } else if (notification.permata_va_number) {
      transaksi.no_va = notification.permata_va_number;
      transaksi.bank = "PERMATA";
    }

    if (notification.payment_type === "credit_card") {
      transaksi.card_type = notification.card_type;
      transaksi.masked_card = notification.masked_card;
      transaksi.bank = notification.bank;
    }

    await transaksi.save();
    console.log(
      `Status transaksi ${orderId} diupdate menjadi '${status}' dengan metode '${transaksi.metode_pembayaran}'`
    );

    if (status === "selesai") {
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
        console.warn("Gagal update ModalUtama.saldo_kas dari omzet (midtrans callback):", e.message);
      }
    }

    if (status === "expire" || status === "dibatalkan") {
      for (const item of transaksi.barang_dibeli) {
        const barang = await Barang.findById(item.kode_barang);
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
                try { await Barang.findByIdAndUpdate(barang._id, { stok: newStock }); } catch (e) { console.warn('Sync Mongo failed:', e.message); }
                console.log(`Stok ${barang.nama_barang} dikembalikan sebanyak ${item.jumlah}, total sekarang: ${newStock}`);
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
            `Stok ${barang.nama_barang} dikembalikan sebanyak ${item.jumlah}, total sekarang: ${barang.stok}`
          );
          try { io.emit('stockUpdated', { id: barang._id.toString(), stok: barang.stok }); } catch (e) { console.warn('Emit failed:', e.message); }
        } else {
          console.warn(
            `Barang dengan _id ${item.kode_barang} tidak ditemukan untuk rollback stok!`
          );
        }
      }
    }

    res.json({ message: "Notifikasi Midtrans diproses", status });
  } catch (err) {
    console.error("Error midtransCallback:", err);
    res.status(500).json({ message: err.message });
  }
};
