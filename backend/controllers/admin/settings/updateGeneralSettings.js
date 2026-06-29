import Settings from "../../../models/settings.js";
import Barang from "../../../models/databarang.js";
import { io } from "../../../server.js";

export const updateGeneralSettings = async (req, res) => {
  try {
    const { lowStockAlert, currency, dateFormat, language, kasWarning } = req.body;
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

    console.log('>>> Mengembalikan respons sukses tanpa memperbarui barang');
    res.json({ message: "Pengaturan umum berhasil diperbarui!", settings });
  } catch (error) {
    console.error(">>> Error updating general settings:", error);
    res.status(400).json({ message: error.message });
  }
};