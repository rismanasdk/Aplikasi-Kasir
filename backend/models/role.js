import { Schema, model } from "mongoose";

const roleSchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    // e.g., "super_admin", "admin", "manager", "kasir", "chef", "security"
  },
  nama: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    // e.g., "Super Admin", "Admin", "Manager", "Kasir", "Chef", "Security"
  },
  deskripsi: {
    type: String,
    default: "",
  },
  tipe: {
    type: String,
    enum: ["pusat", "cabang", "sistem"],
    default: "cabang",
    // pusat: Super Admin, Admin (access all branches)
    // cabang: Manager, Kasir, Chef, Security (access only their branch)
    // sistem: System roles (reserved)
  },
  status: {
    type: String,
    enum: ["aktif", "nonaktif"],
    default: "aktif",
  },
  permissions: [
    {
      type: Schema.Types.ObjectId,
      ref: "Permission",
    },
  ],
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

roleSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

roleSchema.pre(/^find/, function (next) {
  this.populate("permissions");
  next();
});

const Role = model("Role", roleSchema, "Roles");
export default Role;
