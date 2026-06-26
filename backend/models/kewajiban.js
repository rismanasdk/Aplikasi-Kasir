import { Schema, model } from "mongoose";

const pembayaranKewajibanSchema = new Schema(
  {
    tanggal: { type: Date, required: true, default: Date.now },
    jumlah: { type: Number, required: true, min: 1 },
    metode_pembayaran: { type: String, default: "kas" },
    keterangan: { type: String, default: "" },
    saldo_setelah: { type: Number, default: 0 },
  },
  { _id: true }
);

const kewajibanSchema = new Schema(
  {
    kategori: {
      type: String,
      enum: [
        "utang_supplier",
        "pinjaman",
        "pajak_terutang",
        "gaji_terutang",
        "sewa_terutang",
        "lainnya",
      ],
      required: true,
      default: "lainnya",
      index: true,
    },
    nama: { type: String, required: true, trim: true },
    pihak: { type: String, trim: true, default: "" },
    jumlah_awal: { type: Number, required: true, min: 1 },
    sisa_jumlah: { type: Number, required: true, min: 0 },
    tanggal: { type: Date, required: true, default: Date.now, index: true },
    jatuh_tempo: { type: Date, default: null, index: true },
    status: {
      type: String,
      enum: ["belum_lunas", "sebagian", "lunas", "dibatalkan"],
      default: "belum_lunas",
      index: true,
    },
    sumber: {
      type: String,
      enum: ["manual", "pembelian_bahan_baku", "operasional", "lainnya"],
      default: "manual",
    },
    bahan_baku_id: { type: Schema.Types.ObjectId, ref: "BahanBaku", default: null },
    keterangan: { type: String, default: "" },
    pembayaran: { type: [pembayaranKewajibanSchema], default: [] },
  },
  { timestamps: true }
);

kewajibanSchema.pre("validate", function (next) {
  if (this.isNew && (this.sisa_jumlah === undefined || this.sisa_jumlah === null)) {
    this.sisa_jumlah = this.jumlah_awal;
  }

  const jumlahAwal = Number(this.jumlah_awal || 0);
  const sisaJumlah = Number(this.sisa_jumlah || 0);

  if (sisaJumlah <= 0) {
    this.sisa_jumlah = 0;
    if (this.status !== "dibatalkan") this.status = "lunas";
  } else if (sisaJumlah < jumlahAwal) {
    this.status = "sebagian";
  } else if (this.status !== "dibatalkan") {
    this.status = "belum_lunas";
  }

  next();
});

export default model("Kewajiban", kewajibanSchema, "Kewajiban");
