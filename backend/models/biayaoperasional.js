import { Schema, model } from "mongoose";

// New schema: master kategori biaya (no nominal)
const biayaKategoriSchema = new Schema(
  {
    nama: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    branch_id: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
  },
  { timestamps: true }
);

const BiayaOperasional = model("BiayaOperasional", biayaKategoriSchema, "BiayaOperasional");

export default BiayaOperasional;