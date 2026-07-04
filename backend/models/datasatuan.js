import mongoose from "mongoose";

const dataSatuanSchema = new mongoose.Schema(
  {
    nama: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    kode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      unique: true, 
    },
    tipe: {
      type: String,
      required: true,
      enum: ["berat", "volume", "jumlah"],
    },
    deskripsi: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true, 
    },
    branch_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
    },
  },
  { timestamps: true }
);

const DataSatuan = mongoose.model(
  "DataSatuan",
  dataSatuanSchema,
  "Data-Satuan"
);

export default DataSatuan;
