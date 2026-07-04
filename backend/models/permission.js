import { Schema, model } from "mongoose";

const permissionSchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    // Format: "module.action" e.g., "dashboard.view", "transaction.create"
  },
  nama: {
    type: String,
    required: true,
  },
  deskripsi: {
    type: String,
    default: "",
  },
  modul: {
    type: String,
    // e.g., "dashboard", "transaction", "product", "report", "branch", "role"
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

permissionSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

const Permission = model("Permission", permissionSchema, "Permissions");
export default Permission;
