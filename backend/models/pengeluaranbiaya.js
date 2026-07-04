import { Schema, model } from "mongoose";

const pengeluaranBiayaSchema = new Schema(
  {
    // 🔹 NEW: Branch reference (MANDATORY for multi-branch support)
    branch_id: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },

    kategoriId: { type: Schema.Types.ObjectId, ref: "BiayaOperasional", required: true },
    jumlah: { type: Number, required: true },
    tanggal: { type: Date, required: true },
    keterangan: { type: String, default: null },
  },
  { timestamps: true }
);

// 🔹 Create compound index for branch + date filtering
pengeluaranBiayaSchema.index({ branch_id: 1, tanggal: -1 });
pengeluaranBiayaSchema.index({ branch_id: 1, kategoriId: 1 });

const PengeluaranBiaya = model("PengeluaranBiaya", pengeluaranBiayaSchema, "pengeluaran_biaya");

export default PengeluaranBiaya;
