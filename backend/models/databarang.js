import { Schema, model } from "mongoose";

const bahanSchema = new Schema(
  {
    nama: { type: String, required: true },
    harga: { type: Number, required: true },
  },
  { _id: false }
);

const produkBahanSchema = new Schema(
  {
    nama_produk: { type: String, required: true },
    bahan: { type: [bahanSchema], default: [] },
  },
  { _id: false }
);

const barangSchema = new Schema(
  {
    kode_barang: { type: String, required: true, unique: true, maxlength: 12 },
    nama_barang: { type: String, required: true },
    kategori: { type: String, required: true, trim: true },
    harga_beli: { type: Number, default: 0 },
    harga_jual: { type: Number, default: 0 },
    stok: { type: Number, required: true },
    stok_awal: { type: Number, default: 0 },
    stok_minimal: { type: Number, default: 0 },
    margin: { type: Number, default: 0 },
    bahan_baku: { type: [produkBahanSchema], default: [] },
    total_harga_beli: { type: Number, default: 0 },
    hargaFinal: { type: Number, default: 0 },
    use_discount: { type: Boolean, default: true },
    gambar_url: { type: String, default: "" },
    status: { type: String, enum: ["pending", "publish"], default: "pending" },
    // New flag to mark Best Seller items (used for faster user listing)
    bestSeller: { type: Boolean, default: false },
    // Store previous kategori value when a product is promoted to Best Seller
    bestSellerPrevKategori: { type: String, default: "" },
  },
  { timestamps: true }
);

// 🔁 Auto-hitung total harga beli
barangSchema.pre("save", function (next) {
  let totalSemuaProduk = 0;
  this.bahan_baku.forEach((produk) => {
    const subtotal = produk.bahan.reduce((acc, b) => acc + (b.harga || 0), 0);
    totalSemuaProduk += subtotal;
  });
  this.total_harga_beli = totalSemuaProduk * (this.stok || 1);
  next();
});

export default model("Barang", barangSchema, "Data-Barang");
