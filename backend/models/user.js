import { Schema, model } from "mongoose";
import bcrypt from "bcrypt";
import Settings from "./settings.js";

const userSchema = new Schema({
  nama_lengkap: { type: String, required: true },
  username: { type: String, required: true, unique: true },

  // 🔹 Password hanya wajib untuk user non-Google
  password: {
    type: String,
    required: function () {
      return !this.googleId;
    },
  },

  // 🔹 Simpan ID user dari Google
  googleId: { type: String, default: null },

  status: {
    type: String,
    enum: ["aktif", "nonaktif"],
    default: "nonaktif",
  },

  // 🔹 RBAC source of truth: role assignment via role_id
  role_id: {
    type: Schema.Types.ObjectId,
    ref: "Role",
    default: null,
  },

  // 🔹 Legacy role string kept only for backward compatibility during migration
  role: {
    type: String,
    enum: ["user", "admin", "kasir", "manajer", "chef", "security", "super-admin"],
    default: "user",
  },

  // 🔹 Branch reference - WAJIB untuk semua user, termasuk cabang Pusat
  branch_id: {
    type: Schema.Types.ObjectId,
    ref: "Branch",
    required: true,
  },

  profilePicture: { type: String },

  profilePictureUpdates: [
    {
      updatedAt: { type: Date, default: Date.now },
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

userSchema.pre("save", async function (next) {
  try {
    // Update updated_at
    this.updated_at = Date.now();

    // Set default foto profil
    if (this.isNew && !this.profilePicture) {
      const settings = await Settings.findOne();
      this.profilePicture =
        settings?.defaultProfilePicture ||
        "https://t3.ftcdn.net/jpg/05/87/76/66/360_F_587766653_PkBNyGx7mQh9l1XXPtCAq1lBgOsLl6xH.jpg";
    }

    // Enkripsi password kalau ada
    if (this.isModified("password") && this.password) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }

    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.comparePassword = async function (inputPassword) {
  return await bcrypt.compare(inputPassword, this.password);
};

const User = model("User", userSchema, "Users");
export default User;
