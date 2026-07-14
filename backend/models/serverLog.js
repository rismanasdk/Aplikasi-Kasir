import { Schema, model } from "mongoose";

const serverLogSchema = new Schema({
  ip_address: {
    type: String,
    required: true,
  },
  method: {
    type: String,
    enum: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  status_code: {
    type: Number,
    required: true,
  },
  response_time: {
    type: Number, // in milliseconds
    default: 0,
  },
  user_agent: {
    type: String,
    default: null,
  },
  user_id: {
    type: String,
    default: null,
  },
  username: {
    type: String,
    default: null,
  },
  error_message: {
    type: String,
    default: null,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
    expire: 2592000, // Auto-delete after 30 days
  },
  action_type: {
    type: String, // "LOGIN", "LOGOUT", "CREATE", "UPDATE", "DELETE", "UNAUTHORIZED", "SUSPICIOUS", etc.
    default: null,
  },
  details: {
    type: Schema.Types.Mixed,
    default: null,
  },
  branch_id: {
    type: Schema.Types.ObjectId,
    ref: "Branch",
    default: null,
  },
});

export default model("ServerLog", serverLogSchema);
