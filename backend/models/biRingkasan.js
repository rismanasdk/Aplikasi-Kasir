import { Schema, model } from "mongoose";

const biRingkasanSchema = new Schema(
  {
    periode: {
      start: { type: Date },
      end: { type: Date },
    },
    source: { type: String, default: "ai-service" },
    key: { type: String, default: "latest" },
    payload: { type: Schema.Types.Mixed, default: {} },
    pendapatan: { type: Number, default: 0 },
    hpp: { type: Number, default: 0 },
    laba_kotor: { type: Number, default: 0 },
    laba_bersih: { type: Number, default: 0 },
    total_pengeluaran: { type: Number, default: 0 },
    target: { type: Number, default: 0 },
    target_progress_pct: { type: Number, default: 0 },
    metode_pembayaran: [
      {
        metode: { type: String },
        total: { type: Number, default: 0 },
      },
    ],
    top_produk: { type: Schema.Types.Mixed, default: [] },
    bottom_produk: { type: Schema.Types.Mixed, default: [] },
    cashflow: { type: Schema.Types.Mixed, default: {} },
    stock: { type: Schema.Types.Mixed, default: {} },
    inventory_value: { type: Number, default: 0 },
    aset_tetap: { type: Schema.Types.Mixed, default: [] },
    narrative: { type: String, default: "" },
  },
  { timestamps: true }
);

export default model("BiRingkasan", biRingkasanSchema, "bi-ringkasan");
