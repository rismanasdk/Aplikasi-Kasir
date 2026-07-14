// models/ModalUtama.js
import mongoose from "mongoose";

// 🧾 Sub-schema: bahan tiap produk
const produkBahanSchema = new mongoose.Schema({
  nama_produk: { type: String, required: true },
  bahan: [
    {
      nama: { type: String, required: true },
      harga: { type: Number, required: true }, // total harga bahan
      jumlah: { type: Number, required: true, default: 1 }, // total unit/porsi dari bahan
    },
  ],
});

// ✨ Virtual: harga per porsi tiap bahan
produkBahanSchema.virtual("bahan_dengan_harga_porsi").get(function () {
  return this.bahan.map((item) => ({
    ...item.toObject(),
    harga_porsi:
      item.jumlah && item.jumlah > 0
        ? Math.round(item.harga / item.jumlah)
        : item.harga,
  }));
});

// ✨ Virtual: total harga bahan (semua bahan digabung)
produkBahanSchema.virtual("total_harga_bahan").get(function () {
  return Math.round(
    this.bahan.reduce((sum, item) => sum + (item.harga || 0), 0)
  );
});

// ✨ Virtual: total jumlah porsi dari semua bahan
produkBahanSchema.virtual("total_porsi").get(function () {
  return this.bahan.reduce((sum, item) => sum + (item.jumlah || 0), 0);
});

// ✨ Virtual: modal per porsi (total harga bahan / total porsi)
produkBahanSchema.virtual("modal_per_porsi").get(function () {
  const totalHarga = this.total_harga_bahan;
  const totalPorsi = this.total_porsi;
  const modal = totalPorsi > 0 ? totalHarga / totalPorsi : 0;
  return Math.round(modal);
});

// 🏦 Modal utama schema
const modalUtamaSchema = new mongoose.Schema(
  {
    total_modal: { type: Number, required: true, default: 0 },

    // 🧂 Semua bahan baku dalam bentuk produk
    bahan_baku: [produkBahanSchema],

    // ⚙️ Biaya operasional
    biaya_operasional: [
      {
        nama: { type: String, required: true },
        total: { type: Number, required: true, default: 0 },
      },
    ],

    // 🏢 Aset tetap yang dibeli dari saldo kas
    aset_tetap: [
      {
        nama: { type: String, required: true },
        nilai: { type: Number, required: true, default: 0 },
        tanggal_pembelian: { type: Date, default: Date.now },
        keterangan: { type: String, default: "" },
      },
    ],

    // Saldo kas: semua penerimaan / pengeluaran operasional & pembelian bahan
    saldo_kas: { type: Number, required: true, default: 0 },

    // Sisa modal: total modal dikurangi prive (penarikan owner). Tidak otomatis dipengaruhi oleh biaya operasional/bahan.
    sisa_modal: { type: Number, required: true, default: 0 },

    riwayat: [
      {
        tanggal: { type: Date, default: Date.now },
        keterangan: String,
        tipe: {
          type: String,
          enum: ["pengeluaran", "pemasukan", "prive", "pembatalan_pengeluaran"],
        },
        jumlah: Number,
        saldo_setelah: Number,
      },
    ],
    branch_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
    },
  },
  { timestamps: true }
);

// 🧮 Middleware: update sisa_modal otomatis sebelum save
modalUtamaSchema.pre("save", function (next) {
  // sisa_modal adalah total_modal dikurangi total prive (penarikan owner)
  const totalPrive = (this.riwayat || [])
    .filter((r) => r.tipe === "prive")
    .reduce((sum, r) => sum + (r.jumlah || 0), 0);

  this.sisa_modal = Math.round((this.total_modal || 0) - totalPrive);
  next();
});

// ✨ Virtual: total pengeluaran (bahan + operasional)
modalUtamaSchema.virtual("total_pengeluaran").get(function () {
  const totalBahan = this.bahan_baku.reduce(
    (acc, produk) => acc + produk.total_harga_bahan,
    0
  );

  const totalOperasional = this.biaya_operasional.reduce(
    (acc, b) => acc + (b.total || 0),
    0
  );

  const totalAsetTetap = (this.aset_tetap || []).reduce(
    (acc, aset) => acc + (aset.nilai || 0),
    0
  );

  return Math.round(totalBahan + totalOperasional + totalAsetTetap);
});

// ✨ Virtual: total nilai aset tetap
modalUtamaSchema.virtual("total_aset_tetap").get(function () {
  return Math.round(
    (this.aset_tetap || []).reduce((total, aset) => total + (aset.nilai || 0), 0)
  );
});

// ✨ Virtual: total harga semua bahan (semua produk)
modalUtamaSchema.virtual("total_harga_semua_bahan").get(function () {
  return Math.round(
    this.bahan_baku.reduce(
      (total, produk) => total + produk.total_harga_bahan,
      0
    )
  );
});

modalUtamaSchema.set("toJSON", { virtuals: true });
modalUtamaSchema.set("toObject", { virtuals: true });
produkBahanSchema.set("toJSON", { virtuals: true });
produkBahanSchema.set("toObject", { virtuals: true });

export default mongoose.model("ModalUtama", modalUtamaSchema, "ModalUtama");
