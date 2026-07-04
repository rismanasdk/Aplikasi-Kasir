import mongoose from "mongoose";

const kategoriSchema = new mongoose.Schema(
  {
    nama: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    deskripsi: {
      type: String,
      default: "",
      trim: true,
    },
    branch_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
    },
  },
  { timestamps: true }
);

const Kategori = mongoose.model("Kategori", kategoriSchema, "Kategori");

export default Kategori;
