  import mongoose from "mongoose";

  const hppHarianSchema = new mongoose.Schema({
    tanggal: { type: String, required: true }, // '2025-11-14'
    produk: [
      {
        nama_produk: String,
        jumlah_terjual: Number,
        hpp_per_porsi: Number,
        hpp_total: Number,
        pendapatan: Number,
        laba_kotor: Number
      }
    ],
    total_hpp: Number,
    total_pendapatan: Number,
    total_laba_kotor: Number,
    total_beban: { type: Number, default: 0},
    laba_bersih: { type: Number, default: 0},
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null }
  }, { timestamps: true });

  export default mongoose.model("HppHarian", hppHarianSchema, "HppHarian");

  