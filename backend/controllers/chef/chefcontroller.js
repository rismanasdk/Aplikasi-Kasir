import Production from "../../models/production.js";
import Barang from "../../models/databarang.js";
import BahanBaku from "../../models/bahanbaku.js";
import db from "../../config/firebaseAdmin.js";

// Get all productions for the logged-in chef
export const getProductions = async (req, res) => {
  try {
    const chefId = req.user.id;
    const productions = await Production.find({ chef_id: chefId })
      .populate("bahan_baku_id")
      .sort({ createdAt: -1 });
    res.json(productions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get available bahan baku for chef to take
export const getAvailableBahanBaku = async (req, res) => {
  try {
    // Get bahan baku that are not yet taken by any chef (no production record)
    const takenBahanBakuIds = await Production.distinct("bahan_baku_id");
    
    const availableBahanBaku = await BahanBaku.find({
      _id: { $nin: takenBahanBakuIds },
      stok: { $gt: 0 },
      status: "publish" // only show published bahan baku
    }).sort({ createdAt: -1 });

    res.json(availableBahanBaku);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all bahan baku (untuk ditampilkan di chef dashboard)
export const getAllBahanBaku = async (req, res) => {
  try {
    const bahanBakuList = await BahanBaku.find().sort({ createdAt: -1 });
    res.json(bahanBakuList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Take bahan baku (ambil bahan baku untuk diproses)
export const ambilBahanBaku = async (req, res) => {
  try {
    const { bahan_baku_id, jumlah_diproses } = req.body;
    const qty = parseInt(jumlah_diproses) || 0;
    const chefId = req.user.id;

    // Check if bahan baku exists
    const bahanBaku = await BahanBaku.findById(bahan_baku_id);
    if (!bahanBaku) {
      return res.status(404).json({ message: "Bahan baku tidak ditemukan" });
    }

    // Check stok - gunakan total_stok dari struktur baru
    const stokTersedia = bahanBaku.total_stok || 0;
    if (stokTersedia < qty) {
      return res.status(400).json({ 
        message: `Stok ${bahanBaku.nama} tidak cukup. Stok tersedia: ${stokTersedia}` 
      });
    }

    // Create production record - bisa ambil partial (multiple records untuk produk yang sama)
    const production = new Production({
      bahan_baku_id,
      chef_id: chefId,
      jumlah_diproses: qty,
      status: "pending"
    });

    await production.save();

    // Kurangi stok bahan baku (update total_stok)
    const newTotal = Math.max(0, (bahanBaku.total_stok || 0) - qty);
    await BahanBaku.updateOne({ _id: bahanBaku._id }, { $set: { total_stok: newTotal } });

    // Buat barang baru dari bahan baku yang diambil
    const ModalUtama = (await import("../../models/modalutama.js")).default;
    const modalUtama = await ModalUtama.findOne();
    
    let produkData = null;
    let totalPorsi = 0;
    let jumlahProduk = 0;
    
    if (modalUtama && modalUtama.bahan_baku) {
      // Cari produk yang nama_produk sesuai dengan bahan baku nama
      for (const produk of modalUtama.bahan_baku) {
        if (produk.nama_produk === bahanBaku.nama) {
          produkData = produk;
          // Hitung total porsi dari semua bahan dalam produk ini
          totalPorsi = (Array.isArray(produk.bahan) ? produk.bahan : []).reduce((sum, b) => sum + (b.jumlah || 0), 0);
          break;
        }
      }
    }

    if (produkData && totalPorsi > 0) {
      // Hitung jumlah produk yang bisa dibuat dari jumlah yang diambil.
      // Simpan jumlah produk untuk dikembalikan ke client, tapi JANGAN
      // membuat/memasukkan barang ke stok di tahap pengambilan. Pembuatan
      // barang hanya dilakukan saat chef meng-approve (updateProductionStatus).
      jumlahProduk = Math.floor(parseInt(jumlah_diproses) / totalPorsi);
      if (jumlahProduk > 0) {
        console.log(`Produk ${produkData.nama_produk} akan menghasilkan ${jumlahProduk} unit (tidak dibuat dulu, menunggu approval).`);
      }
    }

    // Populate bahan_baku_id for response
    await production.populate("bahan_baku_id");

    res.json({ 
      message: "Bahan baku berhasil diambil dan produk siap diproses", 
      production,
      jumlah_produk_dibuat: jumlahProduk,
      stok_tersisa: typeof newTotal !== 'undefined' ? newTotal : bahanBaku.total_stok
    });
  } catch (error) {
    console.error('Error in ambilBahanBaku:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update production status (only chef can do this)
export const updateProductionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, catatan } = req.body;
    const chefId = req.user.id;

    if (!["approved", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Status tidak valid" });
    }

    const production = await Production.findOne({ _id: id, chef_id: chefId }).populate("bahan_baku_id");
    if (!production) {
      return res.status(404).json({ message: "Produksi tidak ditemukan" });
    }

    if (production.status !== "pending") {
      return res.status(400).json({ message: "Produksi sudah diproses" });
    }

    production.status = status;
    if (status === "approved") {
      production.waktu_mulai = new Date(); // Set waktu mulai ketika chef approve
      
      // Update bahan baku menjadi bahan siap (gunakan updateOne untuk menghindari pre-save hook yang reset total_stok)
      if (production.bahan_baku_id) {
        await BahanBaku.updateOne(
          { _id: production.bahan_baku_id._id },
          {
            $set: {
              is_bahan_siapp: true,
              chef_id: chefId,
              waktu_proses: new Date()
            }
          }
        );
      }
      
      // Buat barang di stok-barang dengan status 'pending' (jika memungkinkan)
      try {
        const ModalUtama = (await import("../../models/modalutama.js")).default;
        const modalUtama = await ModalUtama.findOne();

        let produkData = null;
        let totalPorsi = 0;

        console.log("🔍 DEBUG updateProductionStatus:");
        console.log("   production._id:", production._id);
        console.log("   production.jumlah_diproses:", production.jumlah_diproses);
        console.log("   production.bahan_baku_id?.nama:", production.bahan_baku_id?.nama);
        console.log("   production.bahan_baku_id?.modal_per_porsi:", production.bahan_baku_id?.modal_per_porsi);
        console.log("   modalUtama bahan_baku count:", modalUtama?.bahan_baku?.length);

        if (modalUtama && modalUtama.bahan_baku) {
          console.log("   Searching for produk with nama:", production.bahan_baku_id?.nama);
          for (const produk of modalUtama.bahan_baku) {
            console.log("     - Comparing:", produk.nama_produk, "===", production.bahan_baku_id?.nama, "?", produk.nama_produk === production.bahan_baku_id?.nama);
            if (produk.nama_produk === production.bahan_baku_id?.nama) {
              produkData = produk;
              totalPorsi = (Array.isArray(produk.bahan) ? produk.bahan : []).reduce((sum, b) => sum + (b.jumlah || 0), 0);
              console.log("   ✅ Produk found! totalPorsi:", totalPorsi);
              break;
            }
          }
          if (!produkData) {
            console.log("   ❌ Produk NOT found dalam ModalUtama");
          }
        } else {
          console.log("   ⚠️  ModalUtama atau bahan_baku kosong");
        }

        // Tentukan jumlah produk yang dibuat. Frontend mengirim `jumlah_diproses`
        // sebagai jumlah produk yang diminta chef, jadi gunakan langsung nilai ini.
        // (Sebelumnya ada pembagian oleh totalPorsi yang menyebabkan jumlah
        // produk yang dihasilkan terlalu kecil.)
        const jumlahDiproses = parseInt(production.jumlah_diproses || 0, 10) || 0;
        const jumlahProduk = jumlahDiproses;
        console.log("   Menggunakan jumlahProduk dari jumlah_diproses:", jumlahProduk, "(totalPorsi:", totalPorsi, ")");

        if (jumlahProduk > 0) {
          console.log("   ✅ jumlahProduk > 0, creating/updating barang...");
          const produkNama = produkData ? produkData.nama_produk : (production.bahan_baku_id?.nama || `Produk-${production._id}`);

          // Jika barang sudah ada di stok admin, tambahkan stoknya, jangan buat duplikat
          const existingBarang = await Barang.findOne({ nama_barang: produkNama });

          if (existingBarang) {
            // 1️⃣ Validasi jumlah produk
            if (!jumlahProduk || jumlahProduk <= 0) {
              throw new Error("Jumlah produk tidak valid");
            }
          
            // 2️⃣ Increment stok langsung di database (ATOMIC)
            // Gunakan $inc untuk atomic increment, jangan gunakan .save() agar tidak trigger pre-save hook
            await Barang.updateOne(
              { _id: existingBarang._id },
              { 
                $inc: { stok: jumlahProduk },
                $set: { 
                  // Pastikan field status_publish dan status_stok ada (backward compat)
                  status_publish: existingBarang.status_publish || existingBarang.status || "pending",
                  status_stok: "aman" // default ke aman saat ada stok increment
                }
              }
            );
          
            // 3️⃣ Ambil data terbaru setelah update
            const updatedBarang = await Barang.findById(existingBarang._id);
          
            // 4️⃣ Update Firebase RTDB agar stok sinkron
            try {
              const db = (await import("../../config/firebaseAdmin.js")).default;
              if (db) {
                const barangId = updatedBarang._id.toString();
                await db.ref(`/barang/${barangId}`).update({
                  stok: updatedBarang.stok || 0,
                  nama: updatedBarang.nama_barang || "",
                  harga_jual: updatedBarang.harga_jual || 0,
                  harga_final: Math.round(updatedBarang.hargaFinal) || 0,
                  kategori: updatedBarang.kategori || "",
                  status: "aman" // status stok di Firebase
                });
              }
            } catch (e) {
              console.warn("Gagal update Firebase saat approve:", e.message || e);
            }
          
            // 5️⃣ Emit socket pakai data terbaru
            try {
              const { io } = await import("../../server.js");
              io.emit("barang:updated", updatedBarang);
            } catch (e) {
              console.warn("Gagal emit event barang:updated", e.message || e);
            }
          }
          else {
            // Generate kode barang unik
            const timestamp = Date.now().toString().slice(-6);
            const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            const kodeBarang = `BRG${timestamp}${random}`;

            // Ambil modal_per_porsi dari bahan baku yang di-approve
            const modalPerPorsi = production.bahan_baku_id?.modal_per_porsi || 0;
            
            // Hitung harga jual dengan margin default 35%
            const defaultMargin = 35;
            let hargaJual = 0;
            if (modalPerPorsi > 0) {
              const denom = 1 - (defaultMargin / 100);
              hargaJual = Math.round(modalPerPorsi / denom);
            }

            // Ambil pengaturan pajak, diskon, dan biaya layanan dari Settings
            const Settings = (await import("../../models/settings.js")).default;
            const settings = await Settings.findOne();
            const taxRate = settings?.taxRate ?? 0;
            const globalDiscount = settings?.globalDiscount ?? 0;
            const serviceCharge = settings?.serviceCharge ?? 0;
            const discountRate = globalDiscount || 0;

            // Hitung harga final (harga jual + pajak + biaya - diskon)
            const hargaSetelahDiskon = hargaJual - (hargaJual * discountRate / 100);
            const hargaSetelahPajak = hargaSetelahDiskon + (hargaSetelahDiskon * taxRate / 100);
            const hargaFinal = hargaSetelahPajak + (hargaSetelahPajak * serviceCharge / 100);

            // Buat barang baru dengan data dari bahan baku yang di-approve; status default 'pending'
            const newBarang = new Barang({
              kode_barang: kodeBarang,
              nama_barang: produkNama,
              kategori: "Defaults", // Default kategori, admin bisa ubah kemudian
              harga_beli: Math.round(modalPerPorsi),
              harga_jual: hargaJual,
              stok: jumlahProduk,
              stok_awal: 0,
              stok_minimal: 0,
              margin: defaultMargin,
              bahan_baku: produkData ? [{
                nama_produk: produkData.nama_produk,
                bahan: (Array.isArray(produkData.bahan) ? produkData.bahan : []).map(b => ({
                  nama: b.nama,
                  harga: b.harga || 0
                }))
              }] : [],
              total_harga_beli: Math.round(modalPerPorsi * jumlahProduk),
              hargaFinal: Math.round(hargaFinal),
              use_discount: false,
              gambar_url: "", // Gambar kosong, admin harus upload manual
              // Tetap set `status` untuk backward compat; tambah `status_publish` dan `status_stok`
              status: "pending",
              status_publish: "pending",
              status_stok: "aman"
            });

            await newBarang.save();
            
            // Update Firebase RTDB dengan data barang baru
            try {
              const db = (await import("../../config/firebaseAdmin.js")).default;
              if (db) {
                const barangId = newBarang._id.toString();
                await db.ref(`/barang/${barangId}`).set({
                  stok: newBarang.stok || 0,
                  nama: newBarang.nama_barang || "",
                  harga_jual: newBarang.harga_jual || 0,
                  harga_final: Math.round(newBarang.hargaFinal) || 0,
                  kategori: newBarang.kategori || "",
                  status: "aman" // status stok di Firebase
                });
              }
            } catch (e) {
              console.warn("Gagal update Firebase saat create barang:", e.message || e);
            }
            
            try {
              const { io } = await import("../../server.js");
              io.emit("barang:created", newBarang);
            } catch (e) {
              console.warn('Gagal emit event barang:created', e.message || e);
            }
          }
        }
      } catch (err) {
        console.error('❌ Error creating barang on approve:', err);
        console.error('   Error message:', err.message);
      }
    } else if (status === "cancelled") {
      production.waktu_selesai = new Date();
    }

    if (catatan) production.catatan = catatan;
    await production.save();

    res.json({ message: "Status produksi berhasil diperbarui", production });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};