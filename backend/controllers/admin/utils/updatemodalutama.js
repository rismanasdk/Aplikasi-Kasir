import ModalUtama from "../../../models/modalutama.js";

/**
 * Kurangi sisa modal utama sesuai jumlah pengeluaran
 * @param {number} jumlah - jumlah pengeluaran
 * @param {string} keterangan - keterangan transaksi
 */
export const kurangiModalUtama = async (jumlah, keterangan) => {
  if (!jumlah || jumlah <= 0) return null;

  const modal = await ModalUtama.findOne();
  if (!modal) {
    console.warn("⚠️ Modal utama belum dibuat, pengurangan dilewati.");
    return null;
  }

  // Cek apakah saldo kas cukup (operasional/bahan dibayarkan dari kas)
  if (modal.saldo_kas < jumlah) {
    throw new Error(`Saldo kas tidak cukup. Saldo kas: ${modal.saldo_kas}, dibutuhkan: ${jumlah}.`);
  }

  modal.saldo_kas -= jumlah;
  modal.riwayat.push({
    keterangan,
    tipe: "pengeluaran",
    jumlah,
    saldo_setelah: modal.saldo_kas,
  });

  await modal.save();
  return modal;
};

/**
 * Tambah modal utama (misalnya pemasukan)
 */
export const tambahModalUtama = async (jumlah, keterangan = "Pemasukan baru") => {
  if (!jumlah || jumlah <= 0) return null;

  const modal = await ModalUtama.findOne();
  if (!modal) {
    console.warn("⚠️ Modal utama belum dibuat, penambahan dilewati.");
    return null;
  }

  modal.total_modal += jumlah;
  modal.saldo_kas += jumlah;
  modal.riwayat.push({
    keterangan,
    tipe: "pemasukan",
    jumlah,
    saldo_setelah: modal.saldo_kas,
  });

  await modal.save();
  return modal;
};
