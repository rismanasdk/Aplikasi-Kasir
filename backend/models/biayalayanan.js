import mongoose from "mongoose";

const biayaLayananSchema = new mongoose.Schema(
  {
    nama: {
      type: String,
      required: true,
      trim: true,
    },
    persen: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    deskripsi: {
      type: String,
      default: "",
    },
    branch_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
    },
  },
  { timestamps: true }
);

const BiayaLayanan = mongoose.model("BiayaLayanan", biayaLayananSchema, "BiayaLayanan");
export default BiayaLayanan;