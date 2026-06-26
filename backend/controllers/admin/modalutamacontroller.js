import ModalUtama from "../../models/modalutama.js";
import BahanBaku from "../../models/bahanbaku.js";

// ✅ Ambil semua data modal utama
export const getModalUtama = async (req, res) => {
  try {
    const modal = await ModalUtama.findOne();
    if (!modal) {
      return res.status(404).json({ message: "Data modal utama belum dibuat." });
    }
    res.json(modal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Buat modal utama (pertama kali)
export const createModalUtama = async (req, res) => {
  try {
    const { total_modal } = req.body;

    const existing = await ModalUtama.findOne();
    if (existing) {
      return res
        .status(400)
        .json({ message: "Modal utama sudah ada, gunakan update saja." });
    }

    const modal = new ModalUtama({
      total_modal,
      // when owner sets modal, kas must be increased by same amount
      saldo_kas: total_modal,
      bahan_baku: [],
      biaya_operasional: [],
      riwayat: [
        {
          keterangan: `Setor modal awal: ${total_modal}`,
          tipe: "pemasukan",
          jumlah: total_modal,
          saldo_setelah: total_modal,
        },
      ],
    });

    await modal.save();

    res.status(201).json({
      message: "Modal utama berhasil dibuat!",
      modal,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ✅ Tambah bahan baku / produk baru
export const tambahBahanBaku = async (req, res) => {
  try {
    const { nama_produk, bahan } = req.body;

    const modal = await ModalUtama.findOne();
    if (!modal) {
      return res.status(404).json({ message: "Modal utama belum dibuat." });
    }

    // total baru = jumlah total harga bahan (harga * jumlah)
    let totalBaru = 0;
    if (bahan && Array.isArray(bahan)) {
      totalBaru = bahan.reduce((sum, b) => sum + ((b.harga || 0) * (b.jumlah || 1)), 0);
    }

    // Cek apakah saldo kas cukup (biaya bahan ditanggung kas)
    if (modal.saldo_kas < totalBaru) {
      return res.status(400).json({ 
        message: `Saldo kas tidak cukup. Saldo kas: ${modal.saldo_kas}, dibutuhkan: ${totalBaru}.` 
      });
    }

    // cari produk dengan nama yang sama
    let produk = modal.bahan_baku.find(p => p.nama_produk === nama_produk);

    if (produk) {
      // produk udah ada → tambahkan bahan baru
      produk.bahan.push(...bahan);

      modal.riwayat.push({
        keterangan: `Tambah bahan baru ke produk: ${nama_produk}`,
        tipe: "pengeluaran",
        jumlah: totalBaru,
        saldo_setelah: modal.saldo_kas - totalBaru,
      });
    } else {
      // produk baru
      modal.bahan_baku.push({ nama_produk, bahan });

      modal.riwayat.push({
        keterangan: `Tambah produk baru: ${nama_produk}`,
        tipe: "pengeluaran",
        jumlah: totalBaru,
        saldo_setelah: modal.saldo_kas - totalBaru,
      });
    }

    modal.saldo_kas -= totalBaru;
    await modal.save();

    // Simpan produk lengkap ke koleksi Bahan-Baku
    if (bahan && Array.isArray(bahan)) {
      try {
        // Hitung total_stok dari jumlah semua bahan
        const total_stok = bahan.reduce((sum, b) => sum + (b.jumlah || 0), 0);

        // Cek apakah produk dengan nama yang sama sudah ada di BahanBaku
        const existingProduk = await BahanBaku.findOne({ nama: nama_produk });
        
        if (existingProduk) {
          // Produk sudah ada - tambahkan bahan baru ke array bahan yang sudah ada
          existingProduk.bahan.push(...bahan);
          existingProduk.total_stok = existingProduk.bahan.reduce((sum, b) => sum + (b.jumlah || 0), 0);
          await existingProduk.save();
        } else {
          // Produk baru - buat dokumen baru dengan nama produk dan semua bahan
          const newBahanBaku = new BahanBaku({
            nama: nama_produk,
            bahan: bahan,
            total_stok: total_stok,
          });
          
          await newBahanBaku.save();
        }
      } catch (bahanError) {
        console.error(`Error saving bahan baku untuk produk ${nama_produk}:`, bahanError);
        // Lanjutkan tanpa menghentikan proses utama
      }
    }

    res.json({
      message: produk
        ? "Bahan baru berhasil ditambahkan ke produk yang sudah ada!"
        : "Produk baru berhasil ditambahkan ke modal utama!",
      modal,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ✅ Edit bahan baku (nama produk / bahan di dalamnya)
export const editBahanBaku = async (req, res) => {
  try {
    const { id_produk } = req.params;
    const { nama_produk, bahan } = req.body;

    const modal = await ModalUtama.findOne();
    if (!modal) {
      return res.status(404).json({ message: "Modal utama belum dibuat." });
    }

    const produk = modal.bahan_baku.id(id_produk);
    if (!produk) {
      return res.status(404).json({ message: "Produk tidak ditemukan." });
    }
    // Simpan nama lama untuk sinkronisasi koleksi BahanBaku
    const oldName = produk.nama_produk;

    // Hitung total bahan lama
    const totalLama = (Array.isArray(produk.bahan) ? produk.bahan : []).reduce(
      (sum, b) => sum + ((b.harga || 0) * (b.jumlah || 1)),
      0
    );

    // Update data
    if (nama_produk) produk.nama_produk = nama_produk;
    if (bahan && Array.isArray(bahan)) produk.bahan = bahan;

    // Hitung ulang total bahan baru
    const totalBaru = (Array.isArray(produk.bahan) ? produk.bahan : []).reduce(
      (sum, b) => sum + ((b.harga || 0) * (b.jumlah || 1)),
      0
    );

    // Hitung selisih
    const selisih = totalBaru - totalLama;

    // Jika selisih positif (pengeluaran tambahan), cek saldo kas cukup
    if (selisih > 0 && modal.saldo_kas < selisih) {
      return res.status(400).json({ 
        message: `Saldo kas tidak cukup untuk perubahan ini. Saldo kas: ${modal.saldo_kas}, dibutuhkan tambahan: ${selisih}.` 
      });
    }

    modal.riwayat.push({
      keterangan: `Edit bahan pada produk: ${produk.nama_produk}`,
      tipe: selisih >= 0 ? "pengeluaran" : "pemasukan",
      jumlah: Math.abs(selisih),
      saldo_setelah: selisih >= 0 ? modal.saldo_kas - selisih : modal.saldo_kas + Math.abs(selisih),
    });

    modal.saldo_kas -= selisih;
    await modal.save();

    // Sinkronisasi ke koleksi Bahan-Baku: update atau buat dokumen produk
    try {
      const bahanArray = Array.isArray(produk.bahan) ? produk.bahan : [];
      const total_stok = bahanArray.reduce((sum, b) => sum + (b.jumlah || 0), 0);

      // Cari dokumen di BahanBaku berdasarkan nama lama atau nama baru
      const existingProduk = await BahanBaku.findOne({ $or: [{ nama: oldName }, { nama: produk.nama_produk }] });

      if (existingProduk) {
        existingProduk.nama = produk.nama_produk;
        existingProduk.bahan = bahanArray;
        existingProduk.total_stok = total_stok;
        await existingProduk.save();
      } else {
        const newBahanBaku = new BahanBaku({
          nama: produk.nama_produk,
          bahan: bahanArray,
          total_stok,
        });
        await newBahanBaku.save();
      }
    } catch (syncErr) {
      console.error(`Error syncing BahanBaku for edited product ${produk.nama_produk}:`, syncErr);
      // don't fail the request because of sync issues
    }

    res.json({
      message: "Bahan baku produk berhasil diperbarui!",
      modal,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ✅ Hapus satu produk
export const hapusBahanBaku = async (req, res) => {
  try {
    const { id_produk } = req.params;

    const modal = await ModalUtama.findOne();
    if (!modal) {
      return res.status(404).json({ message: "Modal utama belum dibuat." });
    }

    const produk = modal.bahan_baku.id(id_produk);
    if (!produk) {
      return res.status(404).json({ message: "Produk tidak ditemukan." });
    }

    const totalProduk = produk.bahan.reduce(
      (sum, b) => sum + ((b.harga || 0) * (b.jumlah || 1)),
      0
    );

    produk.deleteOne();

    modal.riwayat.push({
      keterangan: `Hapus bahan baku produk: ${produk.nama_produk}`,
      tipe: "pemasukan",
      jumlah: totalProduk,
      saldo_setelah: modal.saldo_kas + totalProduk,
    });

    modal.saldo_kas += totalProduk;
    await modal.save();

    // Hapus dokumen produk pada koleksi Bahan-Baku jika ada
    try {
      await BahanBaku.findOneAndDelete({ nama: produk.nama_produk });
    } catch (syncErr) {
      console.error(`Error deleting BahanBaku document for ${produk.nama_produk}:`, syncErr);
    }

    res.json({
      message: "Produk bahan baku berhasil dihapus!",
      modal,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ✅ Hapus satu bahan dari produk
export const hapusBahanDariProduk = async (req, res) => {
  try {
    const { id_produk, id_bahan } = req.params;

    const modal = await ModalUtama.findOne();
    if (!modal) {
      return res.status(404).json({ message: "Modal utama belum dibuat." });
    }

    const produk = modal.bahan_baku.id(id_produk);
    if (!produk) {
      return res.status(404).json({ message: "Produk tidak ditemukan." });
    }

    const bahan = produk.bahan.id(id_bahan);
    if (!bahan) {
      return res.status(404).json({ message: "Bahan tidak ditemukan di produk ini." });
    }

    const totalBahan = (bahan.harga || 0) * (bahan.jumlah || 1);

    bahan.deleteOne();

    modal.riwayat.push({
      keterangan: `Hapus bahan "${bahan.nama}" dari produk: ${produk.nama_produk}`,
      tipe: "pemasukan",
      jumlah: totalBahan,
      saldo_setelah: modal.saldo_kas + totalBahan,
    });

    modal.saldo_kas += totalBahan;
    await modal.save();

    // Sinkronisasi dengan koleksi Bahan-Baku: hapus bahan yang sesuai dari dokumen produk
    try {
      const produkBaku = await BahanBaku.findOne({ nama: produk.nama_produk });
      if (produkBaku) {
        // Hapus bahan berdasarkan nama (karena _id subdoc mungkin berbeda)
        produkBaku.bahan = (produkBaku.bahan || []).filter(b => b.nama !== bahan.nama);
        produkBaku.total_stok = (produkBaku.bahan || []).reduce((sum, b) => sum + (b.jumlah || 0), 0);
        if (produkBaku.bahan.length === 0) {
          await BahanBaku.findByIdAndDelete(produkBaku._id);
        } else {
          await produkBaku.save();
        }
      }
    } catch (syncErr) {
      console.error(`Error syncing BahanBaku after deleting bahan ${bahan.nama} from ${produk.nama_produk}:`, syncErr);
    }

    res.json({
      message: `Bahan "${bahan.nama}" berhasil dihapus dari ${produk.nama_produk}!`,
      modal,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ✅ Tambah biaya operasional
export const tambahBiayaOperasional = async (req, res) => {
  try {
    const { nama, total } = req.body;

    const modal = await ModalUtama.findOne();
    if (!modal) {
      return res.status(404).json({ message: "Modal utama belum dibuat." });
    }

    // Cek apakah saldo kas cukup
    if (modal.saldo_kas < total) {
      return res.status(400).json({ 
        message: `Saldo kas tidak cukup. Saldo kas: ${modal.saldo_kas}, dibutuhkan: ${total}.` 
      });
    }

    modal.biaya_operasional.push({ nama, total });

    modal.riwayat.push({
      keterangan: `Biaya operasional: ${nama}`,
      tipe: "pengeluaran",
      jumlah: total,
      saldo_setelah: modal.saldo_kas - total,
    });

    modal.saldo_kas -= total;
    await modal.save();

    res.json({
      message: "Biaya operasional berhasil ditambahkan!",
      modal,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const tambahAsetTetap = async (req, res) => {
  try {
    const { nama, nilai, tanggal_pembelian, keterangan } = req.body;
    const nilaiAset = Number(nilai);

    if (!nama || !String(nama).trim()) {
      return res.status(400).json({ message: "Nama aset tetap wajib diisi." });
    }

    if (!Number.isFinite(nilaiAset) || nilaiAset <= 0) {
      return res.status(400).json({ message: "Nilai aset tetap harus lebih dari 0." });
    }

    const modal = await ModalUtama.findOne();
    if (!modal) {
      return res.status(404).json({ message: "Modal utama belum dibuat." });
    }

    if (modal.saldo_kas < nilaiAset) {
      return res.status(400).json({
        message: `Saldo kas tidak cukup. Saldo kas: ${modal.saldo_kas}, dibutuhkan: ${nilaiAset}.`,
      });
    }

    modal.aset_tetap.push({
      nama: String(nama).trim(),
      nilai: nilaiAset,
      tanggal_pembelian: tanggal_pembelian ? new Date(tanggal_pembelian) : new Date(),
      keterangan: keterangan ? String(keterangan).trim() : "",
    });

    modal.saldo_kas -= nilaiAset;
    modal.riwayat.push({
      keterangan: `Tambah aset tetap: ${String(nama).trim()}`,
      tipe: "pengeluaran",
      jumlah: nilaiAset,
      saldo_setelah: modal.saldo_kas,
    });

    await modal.save();

    res.status(201).json({
      message: "Aset tetap berhasil ditambahkan!",
      modal,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const hapusAsetTetap = async (req, res) => {
  try {
    const { id_aset } = req.params;

    const modal = await ModalUtama.findOne();
    if (!modal) {
      return res.status(404).json({ message: "Modal utama belum dibuat." });
    }

    const aset = modal.aset_tetap.id(id_aset);
    if (!aset) {
      return res.status(404).json({ message: "Aset tetap tidak ditemukan." });
    }

    const nilaiAset = aset.nilai || 0;
    const namaAset = aset.nama;

    aset.deleteOne();
    modal.saldo_kas += nilaiAset;
    modal.riwayat.push({
      keterangan: `Hapus aset tetap: ${namaAset}`,
      tipe: "pemasukan",
      jumlah: nilaiAset,
      saldo_setelah: modal.saldo_kas,
    });

    await modal.save();

    res.json({
      message: "Aset tetap berhasil dihapus!",
      modal,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const tambahModalBaru = async (req, res) => {
  try {
    const { jumlah, keterangan } = req.body;
    const nominal = Number(jumlah);

    const modal = await ModalUtama.findOne();
    if (!modal) {
      return res.status(404).json({ message: "Modal utama belum dibuat." });
    }

    if (!Number.isFinite(nominal) || nominal <= 0) {
      return res.status(400).json({ message: "Jumlah modal harus lebih dari 0." });
    }

    modal.total_modal += nominal;
    modal.saldo_kas += nominal;

    modal.riwayat.push({
      keterangan: keterangan || "Penambahan modal baru",
      tipe: "pemasukan",
      jumlah: nominal,
      saldo_setelah: modal.saldo_kas,
    });

    await modal.save();

    res.json({
      message: "Modal baru berhasil ditambahkan!",
      modal,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const ambilPrive = async (req, res) => {
  try {
    const { jumlah, keterangan } = req.body;
    const nominal = Number(jumlah);

    const modal = await ModalUtama.findOne();
    if (!modal) {
      return res.status(404).json({ message: "Modal utama belum dibuat." });
    }

    if (!Number.isFinite(nominal) || nominal <= 0) {
      return res.status(400).json({ message: "Jumlah pengambilan modal harus lebih dari 0." });
    }

    if (modal.saldo_kas < nominal) {
      return res.status(400).json({ message: `Saldo kas tidak cukup. Saldo kas: ${modal.saldo_kas}, dibutuhkan: ${nominal}.` });
    }

    modal.saldo_kas -= nominal;

    modal.riwayat.push({
      keterangan: keterangan || "Pengambilan modal",
      tipe: "prive",
      jumlah: nominal,
      saldo_setelah: modal.saldo_kas,
    });

    await modal.save();

    res.json({ message: "Pengambilan modal berhasil diproses", modal });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
