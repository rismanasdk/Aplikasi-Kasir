import {Schema, model} from "mongoose";

const laporanSchema = new Schema({
  // 🔹 NEW: Branch reference (MANDATORY for multi-branch support)
  branch_id: {
    type: Schema.Types.ObjectId,
    ref: "Branch",
    required: true,
  },

  laporan_penjualan: {
    // Harian: beberapa controller menggunakan tanggal sebagai Date + jumlah/total,
    // beberapa lain menyimpan tanggal sebagai string 'YYYY-MM-DD' dan menyertakan array `transaksi`.
    harian: [
      new Schema(
        {
          tanggal: { type: Schema.Types.Mixed }, // Date or String (YYYY-MM-DD)
          // legacy/simple counters
          jumlah_transaksi: { type: Number, default: 0 },
          total_penjualan: { type: Number, default: 0 },
          // richer structure used in addTransaksiToLaporan
          transaksi: [
            {
              nomor_transaksi: String,
              total_harga: Number,
              barang_dibeli: Array,
              tanggal_transaksi: Date,
            }
          ],
          total_harian: { type: Number, default: 0 }
        },
        { _id: false }
      )
    ],

    mingguan: [
      new Schema(
        {
          minggu_ke: { type: Number },
          jumlah_transaksi: { type: Number, default: 0 },
          total_penjualan: { type: Number, default: 0 }
        },
        { _id: false }
      )
    ],

    bulanan: [
      new Schema(
        {
          bulan: { type: String },
          jumlah_transaksi: { type: Number, default: 0 },
          total_penjualan: { type: Number, default: 0 }
        },
        { _id: false }
      )
    ]
  },

  periode: {
    start: { type: Date, required: true },
    end: { type: Date, required: true }
  },

  laba: {
    // Store immutable snapshots per transaksi. DO NOT store derived profit values.
    detail: [
      {
        kode_barang: { type: String },
        produk: { type: String },
        hpp: { type: Number, default: 0 }, // modal per porsi saat transaksi
        harga_produk: { type: Number, default: 0 }, // selling price (basis margin)
        harga_final: { type: Number, default: 0 }, // price actually paid by customer

        jumlah: { type: Number, default: 0 },
        subtotal_produk: { type: Number, default: 0 },
        subtotal_final: { type: Number, default: 0 }
      }
    ]
  },

  biaya_operasional_id: {
    type: Schema.Types.ObjectId,
    ref: "BiayaOperasional"
  },

  // pengeluaran bisa berupa angka total atau struktur lebih kompleks di masa mendatang
  pengeluaran: { type: Schema.Types.Mixed, default: 0 },

  rekap_metode_pembayaran: [
    {
      metode: { type: String, required: true },
      total: { type: Number, default: 0 }
    }
  ]
}, { timestamps: true });
// 🔹 Create compound index for branch + date filtering
laporanSchema.index({ branch_id: 1, "periode.start": -1 });
laporanSchema.index({ branch_id: 1, "periode.end": 1 });
const Laporan = model("Laporan", laporanSchema, "Data-Laporan");
export default Laporan;
