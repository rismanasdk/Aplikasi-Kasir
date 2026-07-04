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
    status_publish: { type: String, enum: ["pending", "publish"], default: "pending" },
    status_stok: { type: String, enum: ["aman", "hampir habis", "habis"], default: "aman" },
    // New flag to mark Best Seller items (used for faster user listing)
    bestSeller: { type: Boolean, default: false },
    // Store previous kategori value when a product is promoted to Best Seller
    bestSellerPrevKategori: { type: String, default: "" },
    branch_id: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
  },
  { timestamps: true }
);

function calculateStockStatus(stok, stokMinimal = 0) {
  const currentStok = Number(stok) || 0;
  const minStok = Number(stokMinimal) || 0;

  if (currentStok <= 0) return "habis";
  if (currentStok <= minStok) return "hampir habis";
  return "aman";
}

function calculateRecipeCost(bahanBaku = []) {
  return bahanBaku.reduce((produkAcc, produk) => {
    const subtotal = Array.isArray(produk?.bahan)
      ? produk.bahan.reduce((bahanAcc, bahan) => bahanAcc + (Number(bahan?.harga) || 0), 0)
      : 0;

    return produkAcc + subtotal;
  }, 0);
}

barangSchema.pre("validate", function (next) {
  const publishStatus = this.status_publish || this.status || "pending";

  // Keep legacy `status` aligned with explicit publish state.
  this.status_publish = publishStatus;
  this.status = publishStatus;

  if (!this.status_stok) {
    this.status_stok = calculateStockStatus(this.stok, this.stok_minimal);
  }

  next();
});

// 🔁 Auto-hitung total harga beli
barangSchema.pre("save", function (next) {
  this.status_stok = calculateStockStatus(this.stok, this.stok_minimal);

  // `total_harga_beli` is treated as the explicit total recipe/batch cost.
  // If callers set it manually, preserve that value instead of inflating it by stock.
  if (!this.isModified("total_harga_beli")) {
    this.total_harga_beli = calculateRecipeCost(this.bahan_baku);
  }

  next();
});

export default model("Barang", barangSchema, "Data-Barang");
