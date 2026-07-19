import { Schema, model } from "mongoose";

const cartSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  
  // 🔹 NEW: Branch reference (MANDATORY for multi-branch support)
  branch_id: {
    type: Schema.Types.ObjectId,
    ref: "Branch",
    required: false,
    default: null,
  },

  items: [
    {
      barangId: { type: Schema.Types.ObjectId, ref: "Barang", required: true },
      name: { type: String, required: true },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true },
      image: {type: String, default: ""}
    },
  ],
}, { timestamps: true });

// 🔹 Create index for branch + user filtering
cartSchema.index({ branch_id: 1, userId: 1 });

const Cart = model("Cart", cartSchema, "Cart");
export default Cart;
