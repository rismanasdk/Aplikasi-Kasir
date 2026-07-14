import { Schema, model } from "mongoose";

const branchSchema = new Schema({
  nama: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  alamat: {
    type: String,
    default: "",
  },
  telepon: {
    type: String,
    default: "",
  },
  status: {
    type: String,
    enum: ["aktif", "nonaktif"],
    default: "aktif",
  },
  keterangan: {
    type: String,
    default: "",
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

// Update updated_at sebelum save
branchSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

const Branch = model("Branch", branchSchema, "Branches");
export default Branch;
