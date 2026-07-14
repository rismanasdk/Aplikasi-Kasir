import { Schema, model } from "mongoose";

const blockedIPSchema = new Schema({
  ip_address: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  reason: {
    type: String,
    default: "Suspicious activity",
  },
  blocked_by: {
    type: String, // Username of the security officer who blocked this IP
    required: true,
  },
  blocked_at: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
  block_type: {
    type: String,
    enum: ["manual", "automatic"],
    default: "manual",
  },
  duration_hours: {
    type: Number,
    default: null, // null = permanent, otherwise auto-unblock after X hours
  },
  auto_unblock_at: {
    type: Date,
    default: null, // When this IP will auto-unblock
    index: true, // For efficient querying
  },
  attack_count: {
    type: Number,
    default: 0,
  },
  last_attack: {
    type: Date,
    default: null,
  },
  branch_id: {
    type: Schema.Types.ObjectId,
    ref: "Branch",
    default: null,
  },
});

export default model("BlockedIP", blockedIPSchema);
