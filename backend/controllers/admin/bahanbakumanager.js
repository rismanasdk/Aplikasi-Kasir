import BahanBaku from "../../models/bahanbaku.js";
import Barang from "../../models/databarang.js";
import Kewajiban from "../../models/kewajiban.js";
import { buildBranchFilter, validateAndInjectBranch } from "../../utils/rbacHelper.js";

// Get all bahan baku
export const getAllBahanBaku = async (req, res) => {
  try {
    const bahanBaku = await BahanBaku.find(buildBranchFilter(req.user)).sort({ createdAt: -1 });
    res.json(bahanBaku);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create bahan baku baru
export const createBahanBaku = async (req, res) => {
  try {
    validateAndInjectBranch(req, true);
    const {
      nama_produk,
      bahan,
      metode_pembelian,
      buat_kewajiban,
      supplier,
      jatuh_tempo,
      keterangan_kewajiban,
    } = req.body;
    const isPembelianUtang = metode_pembelian === "utang" || buat_kewajiban === true || buat_kewajiban === "true";

    // Validasi input
    if (!nama_produk) {
      return res.status(400).json({ message: "Nama produk harus diisi" });
    }

    if (!Array.isArray(bahan) || bahan.length === 0) {
      return res.status(400).json({ message: "Bahan harus berupa array dan tidak boleh kosong" });
    }

    // Validasi setiap bahan
    for (const item of bahan) {
      if (!item.nama || item.harga <= 0 || item.jumlah <= 0) {
        return res.status(400).json({ message: "Semua bahan harus memiliki nama, harga, dan jumlah yang valid" });
      }
    }

    // Buat dokumen baru, pre-save hook otomatis menghitung total_stok, total_harga, modal_per_porsi
    const bahanBaku = new BahanBaku({
      nama: nama_produk,
      bahan,
      branch_id: req.body.branch_id || req.user?.branch_id || null
    });

    await bahanBaku.save();

    // PENTING: Tambahkan juga ke ModalUtama agar chef bisa membuat barang saat approve
    try {
      const ModalUtama = (await import("../../models/modalutama.js")).default;
      let modalUtama = await ModalUtama.findOne();
      
      // Hitung total harga bahan yang baru (harga * jumlah)
      const totalHargaBahan = (Array.isArray(bahan) ? bahan : []).reduce((s, it) => s + ((it.harga || 0) * (it.jumlah || 1)), 0);

      if (!modalUtama) {
        // Jika ModalUtama tidak ada, buat yang baru (saldo_kas tetap 0)
        modalUtama = new ModalUtama({
          total_modal: 0,
          saldo_kas: 0,
          bahan_baku: [{
            nama_produk,
            bahan
          }]
        });
        // tidak mencoba mengurangi kas karena tidak ada saldo
      } else {
        // Cek apakah produk sudah ada di bahan_baku
        const existingProduk = modalUtama.bahan_baku.findIndex(p => p.nama_produk === nama_produk);
        if (existingProduk >= 0) {
          // Update produk yang sudah ada
          modalUtama.bahan_baku[existingProduk] = {
            nama_produk,
            bahan
          };
        } else {
          // Tambah produk baru
          modalUtama.bahan_baku.push({
            nama_produk,
            bahan
          });
        }

        // Jika pembelian tempo, jangan kurangi kas; kewajibannya dicatat setelah BahanBaku tersimpan.
        if (!isPembelianUtang && modalUtama.saldo_kas >= totalHargaBahan && totalHargaBahan > 0) {
          modalUtama.saldo_kas -= totalHargaBahan;
          modalUtama.riwayat.push({
            keterangan: `Tambah bahan baku via manager: ${nama_produk}`,
            tipe: "pengeluaran",
            jumlah: totalHargaBahan,
            saldo_setelah: modalUtama.saldo_kas,
          });
        } else if (!isPembelianUtang && totalHargaBahan > 0) {
          console.warn(`Saldo kas tidak cukup atau tidak ada; tidak mengurangi kas untuk produk ${nama_produk}`);
        }
      }
      
      await modalUtama.save();
    } catch (err) {
      console.warn("Gagal sinkronisasi ke ModalUtama:", err.message);
      // Jangan throw error, tetap response sukses karena BahanBaku sudah berhasil dibuat
    }

    if (isPembelianUtang && bahanBaku.total_harga > 0) {
      await Kewajiban.create({
        kategori: "utang_supplier",
        nama: `Utang supplier bahan baku: ${nama_produk}`,
        pihak: supplier ? String(supplier).trim() : "",
        jumlah_awal: bahanBaku.total_harga,
        sisa_jumlah: bahanBaku.total_harga,
        tanggal: new Date(),
        jatuh_tempo: jatuh_tempo ? new Date(jatuh_tempo) : null,
        sumber: "pembelian_bahan_baku",
        bahan_baku_id: bahanBaku._id,
        keterangan: keterangan_kewajiban || `Pembelian bahan baku tempo untuk ${nama_produk}`,
        branch_id: req.body.branch_id || req.user?.branch_id || null,
      });
    }

    // Sinkronkan harga_beli pada Data-Barang: set harga_beli = modal_per_porsi
    try {
      const modalPerPorsi = bahanBaku.modal_per_porsi || 0;
      if (modalPerPorsi > 0) {
        await Barang.updateMany(
          { nama_barang: { $regex: new RegExp(`^${bahanBaku.nama}$`, 'i') } },
          { $set: { harga_beli: Math.round(modalPerPorsi) } }
        );
      }
    } catch (err) {
      console.warn('Gagal update harga_beli di Barang setelah buat BahanBaku:', err.message);
    }

    res.json({ message: "Bahan baku berhasil ditambahkan", bahanBaku });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update bahan baku
export const updateBahanBaku = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_produk, bahan } = req.body;

    // Validasi input
    if (!nama_produk) {
      return res.status(400).json({ message: "Nama produk harus diisi" });
    }

    if (!Array.isArray(bahan) || bahan.length === 0) {
      return res.status(400).json({ message: "Bahan harus berupa array dan tidak boleh kosong" });
    }

    // Validasi setiap bahan
    for (const item of bahan) {
      if (!item.nama || item.harga <= 0 || item.jumlah <= 0) {
        return res.status(400).json({ message: "Semua bahan harus memiliki nama, harga, dan jumlah yang valid" });
      }
    }

    // Gunakan findById + save() supaya pre-save hook jalan
    const bahanBaku = await BahanBaku.findById(id);
    if (!bahanBaku) return res.status(404).json({ message: "Bahan baku tidak ditemukan" });

    const namaBakuLama = bahanBaku.nama; // Simpan nama lama untuk update ModalUtama

    bahanBaku.nama = nama_produk;
    bahanBaku.bahan = bahan;

    await bahanBaku.save(); // pre-save hook otomatis menghitung total_harga & modal_per_porsi

    // PENTING: Update juga di ModalUtama agar tetap sinkron
    try {
      const ModalUtama = (await import("../../models/modalutama.js")).default;
      let modalUtama = await ModalUtama.findOne();
      
      if (modalUtama && modalUtama.bahan_baku) {
        // Cari produk dengan nama lama
        const existingIndex = modalUtama.bahan_baku.findIndex(p => p.nama_produk === namaBakuLama);

        // hitung total harga baru dari bahan (harga * jumlah)
        const newTotalHarga = (Array.isArray(bahan) ? bahan : []).reduce((s, it) => s + ((it.harga || 0) * (it.jumlah || 1)), 0);

        if (existingIndex >= 0) {
          // Hitung total harga lama dari entry yang ada
          const oldEntry = modalUtama.bahan_baku[existingIndex];
          const oldTotalHarga = (Array.isArray(oldEntry.bahan) ? oldEntry.bahan : []).reduce((s, it) => s + ((it.harga || 0) * (it.jumlah || 1)), 0);

          // Update produk yang sudah ada
          modalUtama.bahan_baku[existingIndex] = {
            nama_produk,
            bahan
          };

          const delta = newTotalHarga - oldTotalHarga;
          if (delta > 0) {
            // perlu kurangi kas
            if (modalUtama.saldo_kas >= delta) {
              modalUtama.saldo_kas -= delta;
              modalUtama.riwayat.push({
                keterangan: `Tambah bahan (edit) via manager: ${nama_produk}`,
                tipe: "pengeluaran",
                jumlah: delta,
                saldo_setelah: modalUtama.saldo_kas,
              });
            } else {
              console.warn(`Saldo kas tidak cukup untuk menutupi selisih ${delta} saat edit ${nama_produk}`);
            }
          } else if (delta < 0) {
            // pengurangan biaya -> masuk kas
            modalUtama.saldo_kas += Math.abs(delta);
            modalUtama.riwayat.push({
              keterangan: `Pengembalian dana (edit) via manager: ${nama_produk}`,
              tipe: "pemasukan",
              jumlah: Math.abs(delta),
              saldo_setelah: modalUtama.saldo_kas,
            });
          }
        } else {
          // Jika tidak ketemu nama lama, cari dengan nama baru (buat duplikat)
          const newNameIndex = modalUtama.bahan_baku.findIndex(p => p.nama_produk === nama_produk);
          if (newNameIndex < 0) {
            // Jika juga tidak ada, tambah baru
            modalUtama.bahan_baku.push({
              nama_produk,
              bahan
            });

            // kurangi kas sesuai harga baru jika tersedia
            if (modalUtama.saldo_kas >= newTotalHarga && newTotalHarga > 0) {
              modalUtama.saldo_kas -= newTotalHarga;
              modalUtama.riwayat.push({
                keterangan: `Tambah produk baru via manager: ${nama_produk}`,
                tipe: "pengeluaran",
                jumlah: newTotalHarga,
                saldo_setelah: modalUtama.saldo_kas,
              });
            } else if (newTotalHarga > 0) {
              console.warn(`Saldo kas tidak cukup; tidak mengurangi kas untuk produk baru ${nama_produk}`);
            }
          } else {
            // Update nama baru jika sudah ada
            modalUtama.bahan_baku[newNameIndex] = {
              nama_produk,
              bahan
            };
          }
        }

        await modalUtama.save();
      }
    } catch (err) {
      console.warn("Gagal sinkronisasi ke ModalUtama:", err.message);
      // Jangan throw error, tetap response sukses
    }

    // Sinkronkan harga_beli pada Data-Barang untuk produk ini
    try {
      const modalPerPorsi = bahanBaku.modal_per_porsi || 0;
      if (modalPerPorsi > 0) {
        await Barang.updateMany(
          { nama_barang: { $regex: new RegExp(`^${nama_produk}$`, 'i') } },
          { $set: { harga_beli: Math.round(modalPerPorsi) } }
        );
      }
    } catch (err) {
      console.warn('Gagal update harga_beli di Barang setelah update BahanBaku:', err.message);
    }

    res.json({ message: "Bahan baku berhasil diperbarui", bahanBaku });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete bahan baku
export const deleteBahanBaku = async (req, res) => {
  try {
    const { id } = req.params;
    const bahanBaku = await BahanBaku.findOneAndDelete({ _id: id, ...buildBranchFilter(req.user) });

    if (!bahanBaku) {
      return res.status(404).json({ message: "Bahan baku tidak ditemukan" });
    }

    // PENTING: Hapus juga dari ModalUtama agar tetap sinkron
    try {
      const ModalUtama = (await import("../../models/modalutama.js")).default;
      let modalUtama = await ModalUtama.findOne();
      
      if (modalUtama && modalUtama.bahan_baku) {
        // Cari dan hapus produk dengan nama yang sama
        const filterIndex = modalUtama.bahan_baku.findIndex(p => p.nama_produk === bahanBaku.nama);
        
        if (filterIndex >= 0) {
          // hitung total harga produk yang dihapus untuk possible refund ke kas
          const removed = modalUtama.bahan_baku[filterIndex];
          const removedTotal = (Array.isArray(removed.bahan) ? removed.bahan : []).reduce((s, it) => s + ((it.harga || 0) * (it.jumlah || 1)), 0);
          modalUtama.bahan_baku.splice(filterIndex, 1);
          if (removedTotal > 0) {
            modalUtama.saldo_kas += removedTotal;
            modalUtama.riwayat.push({
              keterangan: `Hapus produk bahan baku via manager: ${bahanBaku.nama}`,
              tipe: "pemasukan",
              jumlah: removedTotal,
              saldo_setelah: modalUtama.saldo_kas,
            });
          }
          await modalUtama.save();
        }
      }
    } catch (err) {
      console.warn("Gagal hapus dari ModalUtama:", err.message);
      // Jangan throw error, tetap response sukses
    }

    res.json({ message: "Bahan baku berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update status bahan baku (pending/publish)
export const updateBahanBakuStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const bahanBaku = await BahanBaku.findById(id);
    if (!bahanBaku) return res.status(404).json({ message: "Bahan baku tidak ditemukan" });

    // Bisa tambah logic status publish/pending di sini
    // contoh: bahanBaku.status = req.body.status;
    // await bahanBaku.save();

    res.json({ message: "Status bahan baku berhasil diperbarui", bahanBaku });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
