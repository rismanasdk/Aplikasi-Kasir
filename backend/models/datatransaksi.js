import { Schema, model } from "mongoose";

const transaksiSchema = new Schema({
  // 🔹 NEW: Branch reference (MANDATORY for multi-branch support)
  branch_id: {
    type: Schema.Types.ObjectId,
    ref: "Branch",
    required: true,
  },

  order_id: {
    type: String,
    required: true,
    unique: true,
    maxlength: 64
  },
  nomor_transaksi: { 
    type: String, 
    required: true, 
    unique: true, 
    maxlength: 64
  },
  tanggal_transaksi: { 
    type: Date, 
    required: true,
    default: Date.now
  },
  barang_dibeli: [
    {
      kode_barang: { type: String },
      nama_barang: { type: String, required: true },
      jumlah: { type: Number, required: true },
      harga_satuan: { type: Number, required: true }, 
      harga_beli: { type: Number, required: true }, 
      subtotal: { type: Number, required: true }
    }
  ],

  total_harga: { 
    type: Number, 
    required: true 
  },
  metode_pembayaran: { 
    type: String,  
    required: true 
  },
  status: { 
    type: String, 
    enum: ["selesai", "pending", "dibatalkan", "expire"], 
    default: "pending" 
  },

  kasir_id: { 
    type: String, 
    required: true
  },
  user_id: {
    type: Schema.Types.ObjectId,
    ref: "user", 
    required: true
  },

  no_va: String,
  stok_dikembalikan: {
    type: Boolean,
    default: false
  },
  completion_processed: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

// 🔹 Create compound index for branch + date filtering
transaksiSchema.index({ branch_id: 1, tanggal_transaksi: -1 });
transaksiSchema.index({ branch_id: 1, status: 1 });
transaksiSchema.index({ branch_id: 1, user_id: 1 });

const Transaksi = model("Transaksi", transaksiSchema, "Data-Transaksi");
export default Transaksi;
