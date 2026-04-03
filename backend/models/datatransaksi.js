import { Schema, model } from "mongoose";

const transaksiSchema = new Schema({
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

const Transaksi = model("Transaksi", transaksiSchema, "Data-Transaksi");
export default Transaksi;
