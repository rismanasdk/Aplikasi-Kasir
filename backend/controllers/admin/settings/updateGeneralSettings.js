import Settings from "../../../models/settings.js";
import Barang from "../../../models/databarang.js";
import { io } from "../../../server.js";
import Transaksi from "../../../models/datatransaksi.js";
import { refreshBiRingkasanByPeriod } from "../laporancontroller.js";

export const updateGeneralSettings = async (req, res) => {
  try {
    const { lowStockAlert, currency, dateFormat, language, kasWarning, targetOmzetBulanan } = req.body;
    console.log('>>> Menerima permintaan updateGeneralSettings dengan data:', req.body);

    let settings = await Settings.findOne();
    if (!settings) {
      console.log('>>> Membuat pengaturan baru');
      settings = await Settings.create({
        lowStockAlert,
        currency,
        dateFormat,
        language,
        kasWarning,
        targetOmzetBulanan
      });
    } else {
      console.log('>>> Memperbarui pengaturan yang ada');
      if (lowStockAlert !== undefined) {
        console.log(`>>> Memperbarui lowStockAlert dari ${settings.lowStockAlert} menjadi ${lowStockAlert}`);
        settings.lowStockAlert = lowStockAlert;
      }
      if (currency !== undefined) settings.currency = currency;
      if (dateFormat !== undefined) settings.dateFormat = dateFormat;
      if (language !== undefined) settings.language = language;
      if (kasWarning !== undefined) settings.kasWarning = kasWarning;
      if (targetOmzetBulanan !== undefined) settings.targetOmzetBulanan = targetOmzetBulanan;
      await settings.save();
      console.log('>>> Pengaturan berhasil disimpan');

      // Emit event via socket untuk notifikasi real-time
      try {
        io.emit('settings:updated', { lowStockAlert: settings.lowStockAlert });
      } catch (e) {
        console.warn('Gagal emit settings:updated via socket:', e.message);
      }
    }

    if (lowStockAlert !== undefined) {
      try {
        console.log(`>>> Memperbarui stok_minimal untuk semua barang menjadi: ${lowStockAlert}`);
        
        const result = await Barang.updateMany(
          {}, 
          { $set: { stok_minimal: lowStockAlert } } 
        );
        
        console.log(`>>> Berhasil memperbarui stok_minimal untuk ${result.modifiedCount} barang.`);
        
        // Kembalikan informasi tentang hasil update
        return res.json({ 
          message: "Pengaturan umum berhasil diperbarui!", 
          settings,
          updatedItems: result.modifiedCount
        });
      } catch (barangUpdateError) {
        console.error(">>> Gagal memperbarui stok_minimal untuk semua barang:", barangUpdateError);
        // Kembalikan error jika gagal memperbarui barang
        return res.status(500).json({ 
          message: "Pengaturan umum berhasil disimpan, tetapi gagal memperbarui stok minimal untuk barang", 
          error: barangUpdateError.message 
        });
      }
    }

    if (targetOmzetBulanan !== undefined) {
      try {
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        await refreshBiRingkasanByPeriod(currentMonthStart.toISOString().slice(0, 10), currentMonthEnd.toISOString().slice(0, 10));
        console.log('>>> Bi-ringkasan periode bulan ini berhasil direfresh setelah memperbarui target omzet.');
      } catch (refreshError) {
        console.warn('>>> Gagal refresh bi-ringkasan setelah update targetOmzetBulanan:', refreshError.message);
      }
    }

    console.log('>>> Mengembalikan respons sukses tanpa memperbarui barang');
    res.json({ message: "Pengaturan umum berhasil diperbarui!", settings });
  } catch (error) {
    console.error(">>> Error updating general settings:", error);
    res.status(400).json({ message: error.message });
  }
};

export const getRekomendasiTargetOmzet = async (req, res) => {
  try {
    const now = new Date();

    // Rentang 90 hari terakhir
    const start90 = new Date(now);
    start90.setDate(start90.getDate() - 90);
    start90.setHours(0, 0, 0, 0);

    const agg = await Transaksi.aggregate([
      {
        $match: {
          status: 'selesai',
          tanggal_transaksi: { $gte: start90, $lte: now }
        }
      },
      { $group: { _id: null, total: { $sum: '$total_harga' } } }
    ]);

    const totalOmzet90Hari = agg?.[0]?.total || 0;

    // Antisipasi data belum genap 90 hari (bisnis baru)
    const jumlahHariData = Math.min(
      90,
      Math.max(1, Math.ceil((now - start90) / (1000 * 60 * 60 * 24)))
    );

    const rataRataHarian = totalOmzet90Hari / jumlahHariData;

    // Jumlah hari bulan depan (otomatis, termasuk tahun kabisat)
    const bulanDepan = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const jumlahHariBulanDepan = new Date(
      bulanDepan.getFullYear(),
      bulanDepan.getMonth() + 1,
      0
    ).getDate();

    const rekomendasiTargetOmzetBulanan = Math.round(rataRataHarian * jumlahHariBulanDepan);

    res.json({
      totalOmzet90Hari,
      rataRataHarian: Math.round(rataRataHarian),
      jumlahHariBulanDepan,
      rekomendasiTargetOmzetBulanan,
    });
  } catch (err) {
    res.status(500).json({ message: "Gagal menghitung rekomendasi", error: err.message });
  }
};