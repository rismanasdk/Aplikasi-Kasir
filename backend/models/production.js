import { Schema, model } from "mongoose";

const productionSchema = new Schema(
  {
    bahan_baku_id: { type: Schema.Types.ObjectId, ref: "BahanBaku", required: true },
    jumlah_diproses: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "cancelled"],
      default: "pending",
    },
    waktu_mulai: { type: Date, default: null },
    waktu_selesai: { type: Date, default: null },
    chef_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    catatan: { type: String, default: "" },
    branch_id: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
  },
  { timestamps: true }
);

export default model("Production", productionSchema, "Productions");