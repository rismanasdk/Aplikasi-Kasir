import { Schema, model } from "mongoose";

const bahanBakuSchema = new Schema(
  {
    nama: { 
      type: String, 
      required: true 
    },
    bahan: [
      {
        nama: { type: String, required: true },
        satuan: { type: String, required: false, default: '' },
        harga: { type: Number, required: true },
        jumlah: { type: Number, required: true }
      }
    ],
    total_stok: { 
      type: Number, 
      required: true,
      default: 0
    },
    total_harga: {
      type: Number,
      // required: true,
      default: 0
    },
    modal_per_porsi: {
      type: Number,
      // required: true,
      default: 0
    },
    branch_id: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
    }
  },
  { timestamps: true }
);

bahanBakuSchema.pre('save', function(next) {
  if (this.bahan && this.bahan.length > 0) {
    this.total_stok = this.bahan.reduce((sum, item) => sum + Number(item.jumlah), 0);
    this.total_harga = this.bahan.reduce((sum, item) => sum + Number(item.harga) * Number(item.jumlah), 0);
    this.modal_per_porsi = this.total_stok > 0 ? parseFloat((this.total_harga / this.total_stok).toFixed(2)) : 0;
  }
  next();
});

export default model("BahanBaku", bahanBakuSchema, "Bahan-Baku");