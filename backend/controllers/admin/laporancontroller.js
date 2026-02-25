import Laporan from "../../models/datalaporan.js";
import BiayaOperasional from "../../models/biayaoperasional.js"; 
import PengeluaranBiaya from "../../models/pengeluaranbiaya.js";
import Transaksi from "../../models/datatransaksi.js";


// Ambil semua laporan
export const getAllLaporan = async (req, res) => {
  try {
    const laporan = await Laporan.find().sort({ createdAt: -1 });
    res.json(laporan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Ambil laporan berdasarkan periode
export const getLaporanByPeriode = async (req, res) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ message: "Harap sertakan parameter start dan end" });
    }

    // Cari laporan yang periode-nya beririsan dengan rentang yang diminta
    const startDate = new Date(start);
    const endDate = new Date(end);

    const laporan = await Laporan.find({
      "periode.start": { $lte: endDate },
      "periode.end": { $gte: startDate }
    }).sort({ "periode.start": -1 });

    if (!laporan || laporan.length === 0) {
      return res.status(404).json({ message: "Laporan untuk periode ini tidak ditemukan" });
    }

    res.json(laporan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Utility: hitung rentang tanggal untuk pilihan cepat
function getDateRange(jenis) {
  const now = new Date();
  let start, end;

  if (jenis === "minggu_lalu") {
    const day = now.getDay();
    const diffToMonday = (day + 6) % 7;
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday - 1, 23, 59, 59);
    start = new Date(end);
    start.setDate(start.getDate() - 6);
  }

  if (jenis === "bulan_lalu") {
    const bulanLalu = now.getMonth() - 1;
    const tahun = bulanLalu < 0 ? now.getFullYear() - 1 : now.getFullYear();
    const bulan = (bulanLalu + 12) % 12;

    start = new Date(tahun, bulan, 1, 0, 0, 0);
    end = new Date(tahun, bulan + 1, 0, 23, 59, 59);
  }

  return { start, end };
}

// Ambil ringkasan penjualan secara realtime dari Transaksi dan PengeluaranBiaya
// Query params: ?start=YYYY-MM-DD&end=YYYY-MM-DD (both required)
export const getRingkasanPenjualan = async (req, res) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ message: "Harap sertakan query params 'start' dan 'end' dalam format YYYY-MM-DD" });
    }

    const startDate = new Date(String(start) + 'T00:00:00.000Z');
    const endDate = new Date(String(end) + 'T23:59:59.999Z');

    // Pipeline menggunakan $facet untuk efisiensi: pendapatan dan item-level agregasi
    const transaksiMatch = {
      status: "selesai",
      tanggal_transaksi: { $gte: startDate, $lte: endDate }
    };

    const transaksiFacet = await Transaksi.aggregate([
      { $match: transaksiMatch },
      { $facet: {
          pendapatan: [ { $group: { _id: null, total_pendapatan: { $sum: "$total_harga" } } } ],
          items: [ { $unwind: { path: "$barang_dibeli", preserveNullAndEmptyArrays: true } },
                   { $group: { _id: null, total_hpp: { $sum: { $multiply: [ { $toDouble: "$barang_dibeli.harga_beli" }, { $toDouble: "$barang_dibeli.jumlah" } ] } }, total_barang_terjual: { $sum: { $toDouble: "$barang_dibeli.jumlah" } } } }
        ]
      } }
    ]);

    const pendapatanObj = (transaksiFacet && transaksiFacet[0] && transaksiFacet[0].pendapatan && transaksiFacet[0].pendapatan[0]) || { total_pendapatan: 0 };
    const itemsObj = (transaksiFacet && transaksiFacet[0] && transaksiFacet[0].items && transaksiFacet[0].items[0]) || { total_hpp: 0, total_barang_terjual: 0 };

    const total_pendapatan = Number(pendapatanObj.total_pendapatan || 0);
    const total_hpp = Number(itemsObj.total_hpp || 0);
    const total_barang_terjual = Number(itemsObj.total_barang_terjual || 0);

    // Pengeluaran biaya operasional dalam rentang
    const pengeluaranAgg = await PengeluaranBiaya.aggregate([
      { $match: { tanggal: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: null, total_biaya_operasional: { $sum: "$jumlah" } } }
    ]);
    const total_biaya_operasional = (pengeluaranAgg && pengeluaranAgg[0] && pengeluaranAgg[0].total_biaya_operasional) ? Number(pengeluaranAgg[0].total_biaya_operasional) : 0;

    const total_laba_kotor = total_pendapatan - total_hpp;
    const total_laba_bersih = total_laba_kotor - total_biaya_operasional;

    return res.json({
      ringkasan: {
        total_pendapatan,
        total_hpp,
        total_laba_kotor,
        total_biaya_operasional,
        total_laba_bersih,
        total_barang_terjual
      }
    });
  } catch (error) {
    console.error('Error getRingkasanPenjualan realtime:', error);
    res.status(500).json({ message: error.message });
  }
};

// Ambil detail laba per hari dan per-produk secara realtime
export const getDetailLaba = async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ message: "Harap sertakan start dan end" });

    const startDate = new Date(String(start) + 'T00:00:00.000Z');
    const endDate = new Date(String(end) + 'T23:59:59.999Z');

    // Aggregate transaksi per day (produk, total_hpp, total_pendapatan)
    const transaksiPipeline = [
      { $match: { status: 'selesai', tanggal_transaksi: { $gte: startDate, $lte: endDate } } },
      { $project: { tanggal_transaksi: 1, barang_dibeli: 1 } },
      { $unwind: '$barang_dibeli' },
      { $addFields: { tanggal_str: { $dateToString: { format: '%Y-%m-%d', date: '$tanggal_transaksi' } } } },
      { $group: {
          _id: {
            tanggal: '$tanggal_str',
            kode: '$barang_dibeli.kode_barang',
            nama: '$barang_dibeli.nama_barang',
            harga_satuan: '$barang_dibeli.harga_satuan',
            harga_beli: '$barang_dibeli.harga_beli'
          },
          jumlah: { $sum: '$barang_dibeli.jumlah' },
          subtotal: { $sum: '$barang_dibeli.subtotal' }
      } },
      { $group: {
          _id: '$_id.tanggal',
          produk: { $push: {
            nama_produk: '$_id.nama',
            kode_barang: '$_id.kode',
            jumlah_terjual: '$jumlah',
            hpp_per_porsi: '$_id.harga_beli',
            pendapatan: { $multiply: ['$_id.harga_satuan', '$jumlah'] },
            laba_kotor: { $multiply: [ { $subtract: ['$_id.harga_satuan', '$_id.harga_beli'] }, '$jumlah' ] },
            subtotal_produk: '$subtotal'
          } },
          total_hpp: { $sum: { $multiply: ['$_id.harga_beli', '$jumlah'] } },
          total_pendapatan: { $sum: { $multiply: ['$_id.harga_satuan', '$jumlah'] } }
      } },
      { $project: { tanggal: '$_id', produk: 1, total_hpp: 1, total_pendapatan: 1, _id: 0 } },
      { $sort: { tanggal: 1 } }
    ];

    const transaksiData = await Transaksi.aggregate(transaksiPipeline);

    // Aggregate pengeluaran per day within range
    const pengeluaranAgg = await PengeluaranBiaya.aggregate([
      { $match: { tanggal: { $gte: startDate, $lte: endDate } } },
      { $addFields: { tanggal_str: { $dateToString: { format: '%Y-%m-%d', date: '$tanggal' } } } },
      { $group: { _id: '$tanggal_str', total_beban: { $sum: '$jumlah' } } },
      { $project: { tanggal: '$_id', total_beban: 1, _id: 0 } },
      { $sort: { tanggal: 1 } }
    ]);

    // Merge transaksiData and pengeluaranAgg by tanggal
    const mapByDate = {};
    transaksiData.forEach(d => {
      mapByDate[d.tanggal] = {
        tanggal: d.tanggal,
        produk: d.produk || [],
        total_hpp: d.total_hpp || 0,
        total_pendapatan: d.total_pendapatan || 0,
        total_beban: 0
      };
    });
    pengeluaranAgg.forEach(p => {
      if (mapByDate[p.tanggal]) {
        mapByDate[p.tanggal].total_beban = p.total_beban || 0;
      } else {
        mapByDate[p.tanggal] = {
          tanggal: p.tanggal,
          produk: [],
          total_hpp: 0,
          total_pendapatan: 0,
          total_beban: p.total_beban || 0
        };
      }
    });

    // Convert map to sorted array
    const allDates = Object.keys(mapByDate).sort();
    const merged = allDates.map(t => mapByDate[t]);

    return res.json({ data: merged });
  } catch (error) {
    console.error('Error getDetailLaba realtime:', error);
    return res.status(500).json({ message: error.message });
  }
};

// Ambil rekap metode pembayaran realtime
export const getRekapMetodePembayaranRealtime = async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ message: "Harap sertakan start dan end" });

    const startDate = new Date(String(start) + 'T00:00:00.000Z');
    const endDate = new Date(String(end) + 'T23:59:59.999Z');

    const agg = await Transaksi.aggregate([
      { $match: { status: 'selesai', tanggal_transaksi: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$metode_pembayaran', total: { $sum: '$total_harga' } } },
      { $project: { metode: '$_id', total: 1, _id: 0 } }
    ]);

    return res.json({ rekap: agg });
  } catch (error) {
    console.error('Error getRekapMetodePembayaranRealtime:', error);
    return res.status(500).json({ message: error.message });
  }
};

// Ambil rekap metode pembayaran
export const getRekapMetodePembayaran = async (req, res) => {
  try {
    const laporan = await Laporan.find().sort({ createdAt: -1 }).limit(1);
    if (!laporan || laporan.length === 0) {
      return res.status(404).json({ message: "Laporan belum tersedia" });
    }

    res.json(laporan[0].rekap_metode_pembayaran);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Ambil data laba
export const getLaba = async (req, res) => {
  try {
    const laporan = await Laporan.find()
      .sort({ createdAt: -1 })
      .limit(1)
      .populate("biaya_operasional_id"); 

    if (!laporan || laporan.length === 0) {
      return res.status(404).json({ message: "Laporan belum tersedia" });
    }

    const currentLaporan = laporan[0];
    const detail = currentLaporan.laba.detail || [];
    const computedDetail = (detail || []).map(item => {
      const hpp = item.hpp || 0;
      const harga_produk = item.harga_produk || 0;
      const jumlah = item.jumlah || 0;
      const subtotal_produk = item.subtotal_produk || (harga_produk * jumlah);
      const subtotal_final = item.subtotal_final || 0;

      const labaPerItem = harga_produk - hpp;
      const totalLaba = labaPerItem * jumlah; 

      return {
        produk: item.produk,
        kode_barang: item.kode_barang,
        harga_jual: harga_produk,
        harga_beli: hpp,
        labaPerItem,
        jumlahTerjual: jumlah,
        totalLaba,
        subtotal_produk,
        subtotal_final
      };
    });

    const totalLabaKotor = computedDetail.reduce((acc, it) => acc + (it.totalLaba || 0), 0);

    // Hitung total pengeluaran biaya untuk periode laporan dari collection pengeluaran_biaya
    let totalBiayaOperasional = 0;
    try {
      const start = currentLaporan.periode.start ? new Date(currentLaporan.periode.start) : null;
      const end = currentLaporan.periode.end ? new Date(currentLaporan.periode.end) : null;
      const match = {};
      if (start && end) match.tanggal = { $gte: start, $lte: end };
      const agg = await PengeluaranBiaya.aggregate([
        { $match: match },
        { $group: { _id: null, total: { $sum: "$jumlah" } } }
      ]);
      totalBiayaOperasional = agg && agg[0] ? agg[0].total : 0;
    } catch (e) {
      console.warn("Gagal menghitung total biaya operasional untuk laporan:", e.message);
      totalBiayaOperasional = 0;
    }

    const totalLabaBersih = totalLabaKotor - totalBiayaOperasional;

    // Do NOT persist derived profit values to DB. Return computed summary instead.
    res.json({
      ringkasan: {
        total_laba_kotor: totalLabaKotor,
        total_biaya_operasional: totalBiayaOperasional,
        total_laba_bersih: totalLabaBersih
      },
      detail_laba: computedDetail,
      biaya_operasional: currentLaporan.biaya_operasional_id || {}
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getDaftarBulanLaporan = async (req, res) => {
  try {
    const laporan = await Laporan.find().sort({ "periode.start": -1 });

    const daftarBulan = laporan.map((lap) => {
      const date = new Date(lap.periode.start);
      const namaBulan = date.toLocaleString("id-ID", { month: "long" });
      const tahun = date.getFullYear();

      return {
        id: lap._id,
        nama_bulan: `${namaBulan} ${tahun}`,
        bulan: date.getMonth() + 1,
        tahun,
        createdAt: lap.createdAt,
      };
    });

    res.json({ daftar_bulan: daftarBulan });
  } catch (err) {
    console.error("Gagal mengambil daftar bulan:", err);
    res.status(500).json({ message: "Gagal mengambil daftar bulan laporan" });
  }
};

export const getLaporanById = async (req, res) => {
  try {
    const { id } = req.params;
    const laporan = await Laporan.findById(id).populate("biaya_operasional_id");

    if (!laporan) {
      return res.status(404).json({ message: "Laporan tidak ditemukan" });
    }

    res.json(laporan);
  } catch (err) {
    console.error("Gagal mengambil laporan:", err);
    res.status(500).json({ message: "Gagal mengambil laporan bulanan" });
  }
};

