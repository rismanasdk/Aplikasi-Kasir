import Laporan from "../../models/datalaporan.js";
import BiayaOperasional from "../../models/biayaoperasional.js"; 
import PengeluaranBiaya from "../../models/pengeluaranbiaya.js";
import Transaksi from "../../models/datatransaksi.js";
import ModalUtama from "../../models/modalutama.js";
import Barang from "../../models/databarang.js";
import BahanBaku from "../../models/bahanbaku.js";
import Kewajiban from "../../models/kewajiban.js";
import BiRingkasan from "../../models/biRingkasan.js";
import Settings from "../../models/settings.js";
import { buildAiUrl, fetchWithTimeout, parseAiServiceResponse } from "../../services/aiService.js";
import { buildBranchFilter } from "../../utils/rbacHelper.js";

const JAKARTA_OFFSET_MINUTES = 7 * 60;

const parseJakartaDateRange = (dateString) => {
  const parts = String(dateString).split("-").map((p) => Number(p));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [year, month, day] = parts;
  const startUtc = Date.UTC(year, month - 1, day, 0, 0, 0, 0) - JAKARTA_OFFSET_MINUTES * 60 * 1000;
  const endUtc = Date.UTC(year, month - 1, day, 23, 59, 59, 999) - JAKARTA_OFFSET_MINUTES * 60 * 1000;
  return {
    start: new Date(startUtc),
    end: new Date(endUtc),
  };
};

export const getAllLaporan = async (req, res) => {
  try {
    const laporan = await Laporan.find(buildBranchFilter(req.user)).sort({ createdAt: -1 });
    res.json(laporan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getLaporanByPeriode = async (req, res) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ message: "Harap sertakan parameter start dan end" });
    }

    const startDateRange = parseJakartaDateRange(start);
    const endDateRange = parseJakartaDateRange(end);
    if (!startDateRange || !endDateRange) {
      return res.status(400).json({ message: "Format tanggal salah. Gunakan YYYY-MM-DD." });
    }

    const laporan = await Laporan.find({
      ...buildBranchFilter(req.user),
      "periode.start": { $lte: endDateRange.end },
      "periode.end": { $gte: startDateRange.start }
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

    const startDateRange = parseJakartaDateRange(start);
    const endDateRange = parseJakartaDateRange(end);
    if (!startDateRange || !endDateRange) {
      return res.status(400).json({ message: "Format tanggal salah. Gunakan YYYY-MM-DD." });
    }

    const startDate = startDateRange.start;
    const endDate = endDateRange.end;

    // Pipeline menggunakan $facet untuk efisiensi: pendapatan dan item-level agregasi
    const branchFilter = buildBranchFilter(req.user);
    const pengeluaranMatch = {
      tanggal: { $gte: startDate, $lte: endDate },
      ...branchFilter
    };
    const transaksiMatch = {
      status: "selesai",
      tanggal_transaksi: { $gte: startDate, $lte: endDate },
      ...branchFilter
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
    const targetOmzet = await Settings.findOne();
    const target = targetOmzet?.targetOmzetBulanan ?? 0;


    // Pengeluaran biaya operasional dalam rentang
    const pengeluaranAgg = await PengeluaranBiaya.aggregate([
      { $match: pengeluaranMatch },
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
        total_barang_terjual,
        target,
      }
    });
  } catch (error) {
    console.error('Error getRingkasanPenjualan realtime:', error);
    res.status(500).json({ message: error.message });
  }
};

export const refreshBiRingkasanByPeriod = async (start, end) => {
  const targetUrl = buildAiUrl("/bi/ringkasan", { start, end });
  const response = await fetchWithTimeout(targetUrl, { method: "GET", headers: { Accept: "application/json" } });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`AI service returned an error ${response.status}: ${errorBody}`);
  }

  const payload = await parseAiServiceResponse(response);
  const settingsDoc = await Settings.findOne();
  const target = settingsDoc?.targetOmzetBulanan ?? 0;
  const startDate = start ? new Date(String(start)) : null;
  const endDate = end ? new Date(String(end)) : null;

  // Defensive number resolver: AI responses may return numbers or objects like { total: 0 }
  const resolveNumber = (v) => {
    if (v == null) return 0;
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const cleaned = v.replace(/[^0-9.\-]/g, '');
      const n = Number(cleaned);
      return Number.isNaN(n) ? 0 : n;
    }
    if (typeof v === 'object') {
      if (v.total != null) return resolveNumber(v.total);
      if (v.value != null) return resolveNumber(v.value);
      // if object has numeric properties, try to find one
      for (const key of Object.keys(v)) {
        const candidate = v[key];
        if (typeof candidate === 'number') return candidate;
        if (typeof candidate === 'string') {
          const n = Number(candidate.replace(/[^0-9.\-]/g, ''));
          if (!Number.isNaN(n)) return n;
        }
      }
      return 0;
    }
    return 0;
  };

  const pickNumber = (obj, keys) => {
    for (const k of keys) {
      if (obj && Object.prototype.hasOwnProperty.call(obj, k)) {
        const v = obj[k];
        const n = resolveNumber(v);
        if (n !== 0) return n;
      }
    }
    return 0;
  };

  // debug log to inspect AI payload structure when issues occur
  console.debug('AI payload for bi-ringkasan:', JSON.stringify(payload));

  const doc = await BiRingkasan.findOneAndUpdate(
    { key: "latest" },
    {
      $set: {
        key: "latest",
        periode: {
          start: startDate,
          end: endDate,
        },
        source: `ai-service:${aiServiceUrl}`,
        payload,
        pendapatan: pickNumber(payload, ['pendapatan', 'total_pendapatan', 'total'] ),
        hpp: pickNumber(payload, ['hpp', 'total_hpp', 'total_hpp'] ),
        laba_kotor: pickNumber(payload, ['laba_kotor', 'total_laba_kotor'] ),
        laba_bersih: pickNumber(payload, ['laba_bersih_estimasi', 'total_laba_bersih', 'laba_bersih'] ),
        total_pengeluaran: pickNumber(payload, ['pengeluaran', 'total_pengeluaran', 'total'] ),
        target,
        target_progress_pct: pickNumber(payload, ['target_progress_pct', 'target_progress_pct'] ),
        metode_pembayaran: payload.metode_pembayaran || [],
        top_produk: payload.top_produk || [],
        bottom_produk: payload.bottom_produk || [],
        cashflow: payload.cashflow || {},
        stock: payload.stock || {},
        inventory_value: pickNumber(payload, ['inventory_value', 'inventory_value'] ),
        aset_tetap: payload.aset_tetap || [],
        narrative: payload.narrative || "",
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return doc;
};

export const storeBiRingkasan = async (req, res) => {
  try {
    const { start, end } = req.query;
    const doc = await refreshBiRingkasanByPeriod(start, end);
    return res.status(201).json({ message: "Bi-ringkasan tersimpan", data: doc });
  } catch (error) {
    console.error("Error storeBiRingkasan:", error);
    return res.status(500).json({ message: "Gagal menyimpan bi-ringkasan", error: error.message });
  }
};

export const getSavedBiRingkasan = async (req, res) => {
  try {
    const saved = await BiRingkasan.find({ key: "latest" }).sort({ updatedAt: -1 }).limit(1);
    return res.json({ data: saved });
  } catch (error) {
    console.error("Error getSavedBiRingkasan:", error);
    return res.status(500).json({ message: "Gagal mengambil data bi-ringkasan", error: error.message });
  }
};

// Ambil detail laba per hari dan per-produk secara realtime
export const getDetailLaba = async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ message: "Harap sertakan start dan end" });

    const startDateRange = parseJakartaDateRange(start);
    const endDateRange = parseJakartaDateRange(end);
    if (!startDateRange || !endDateRange) {
      return res.status(400).json({ message: "Format tanggal salah. Gunakan YYYY-MM-DD." });
    }

    const startDate = startDateRange.start;
    const endDate = endDateRange.end;

    // Aggregate transaksi per day (produk, total_hpp, total_pendapatan)
    const branchFilter = buildBranchFilter(req.user);
    const transaksiPipeline = [
      { $match: { status: 'selesai', tanggal_transaksi: { $gte: startDate, $lte: endDate }, ...branchFilter } },
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
      { $match: { tanggal: { $gte: startDate, $lte: endDate }, ...branchFilter } },
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

    const startDateRange = parseJakartaDateRange(start);
    const endDateRange = parseJakartaDateRange(end);
    if (!startDateRange || !endDateRange) {
      return res.status(400).json({ message: "Format tanggal salah. Gunakan YYYY-MM-DD." });
    }

    const startDate = startDateRange.start;
    const endDate = endDateRange.end;

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
      const match = buildBranchFilter(req.user);
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
    const laporan = await Laporan.find(buildBranchFilter(req.user)).sort({ "periode.start": -1 });
    const seen = new Set();
    const opsiJakarta = { timeZone: "Asia/Jakarta" };

    const daftarBulan = laporan.reduce((acc, lap) => {
      const date = new Date(lap.periode.start);
      const tahun = Number(date.toLocaleString("id-ID", { ...opsiJakarta, year: "numeric" }));
      const bulan = Number(date.toLocaleString("en-US", { ...opsiJakarta, month: "numeric" }));
      const key = `${tahun}-${String(bulan).padStart(2, "0")}`;

      if (seen.has(key)) {
        return acc;
      }
      seen.add(key);

      const namaBulan = date.toLocaleString("id-ID", { ...opsiJakarta, month: "long" });
      acc.push({
        id: lap._id,
        nama_bulan: `${namaBulan} ${tahun}`,
        bulan,
        tahun,
        createdAt: lap.createdAt,
      });
      return acc;
    }, []);

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

export const getNeraca = async (req, res) => {
  try {
    const tanggal = req.query.tanggal ? new Date(String(req.query.tanggal)) : new Date();
    const asOf = Number.isNaN(tanggal.getTime()) ? new Date() : tanggal;

    const [
      modal,
      persediaanBarangAgg,
      persediaanBahanAgg,
      kewajibanAgg,
      kewajibanPerKategori,
      labaAgg,
      pengeluaranAgg,
    ] = await Promise.all([
      ModalUtama.findOne(),
      Barang.aggregate([
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $multiply: [
                  { $toDouble: { $ifNull: ["$harga_beli", 0] } },
                  { $toDouble: { $ifNull: ["$stok", 0] } },
                ],
              },
            },
          },
        },
      ]),
      BahanBaku.aggregate([
        { $group: { _id: null, total: { $sum: { $toDouble: { $ifNull: ["$total_harga", 0] } } } } },
      ]),
      Kewajiban.aggregate([
        { $match: { status: { $in: ["belum_lunas", "sebagian"] } } },
        { $group: { _id: null, total: { $sum: "$sisa_jumlah" } } },
      ]),
      Kewajiban.aggregate([
        { $match: { status: { $in: ["belum_lunas", "sebagian"] } } },
        { $group: { _id: "$kategori", total: { $sum: "$sisa_jumlah" } } },
        { $project: { nama: "$_id", total: 1, _id: 0 } },
        { $sort: { nama: 1 } },
      ]),
      Transaksi.aggregate([
        { $match: { status: "selesai" } },
        {
          $facet: {
            pendapatan: [
              { $group: { _id: null, total_pendapatan: { $sum: "$total_harga" } } },
            ],
            hpp: [
              { $unwind: { path: "$barang_dibeli", preserveNullAndEmptyArrays: true } },
              {
                $group: {
                  _id: null,
                  total_hpp: {
                    $sum: {
                      $multiply: [
                        { $toDouble: { $ifNull: ["$barang_dibeli.harga_beli", 0] } },
                        { $toDouble: { $ifNull: ["$barang_dibeli.jumlah", 0] } },
                      ],
                    },
                  },
                },
              },
            ],
          },
        },
      ]),
      PengeluaranBiaya.aggregate([
        { $group: { _id: null, total: { $sum: "$jumlah" } } },
      ]),
    ]);

    const kas = Number(modal?.saldo_kas || 0);
    const asetTetap = Number(modal?.total_aset_tetap || 0);
    const persediaanBarang = Number(persediaanBarangAgg?.[0]?.total || 0);
    const persediaanBahanBaku = Number(persediaanBahanAgg?.[0]?.total || 0);
    const totalAset = kas + persediaanBarang + persediaanBahanBaku + asetTetap;

    const totalLiabilitas = Number(kewajibanAgg?.[0]?.total || 0);
    const totalEkuitas = totalAset - totalLiabilitas;

    const labaData = labaAgg?.[0] || {};
    const totalPendapatan = Number(labaData.pendapatan?.[0]?.total_pendapatan || 0);
    const totalHpp = Number(labaData.hpp?.[0]?.total_hpp || 0);
    const totalBeban = Number(pengeluaranAgg?.[0]?.total || 0);
    const labaBerjalan = totalPendapatan - totalHpp - totalBeban;
    const modalDisetor = Number(modal?.sisa_modal || modal?.total_modal || 0);
    const penyesuaianEkuitas = totalEkuitas - modalDisetor - labaBerjalan;

    return res.json({
      tanggal: asOf,
      aset: {
        lancar: [
          { nama: "Kas", total: kas },
          { nama: "Persediaan Barang", total: persediaanBarang },
          { nama: "Persediaan Bahan Baku", total: persediaanBahanBaku },
        ],
        tetap: [
          { nama: "Aset Tetap", total: asetTetap },
        ],
        total_aset_lancar: kas + persediaanBarang + persediaanBahanBaku,
        total_aset_tetap: asetTetap,
        total_aset: totalAset,
      },
      liabilitas: {
        detail: kewajibanPerKategori,
        total_liabilitas: totalLiabilitas,
      },
      ekuitas: {
        detail: [
          { nama: "Modal Disetor / Sisa Modal", total: modalDisetor },
          { nama: "Laba Berjalan", total: labaBerjalan },
          { nama: "Penyesuaian Ekuitas", total: penyesuaianEkuitas },
        ],
        total_ekuitas: totalEkuitas,
      },
      kontrol: {
        total_liabilitas_dan_ekuitas: totalLiabilitas + totalEkuitas,
        selisih: totalAset - (totalLiabilitas + totalEkuitas),
      },
      catatan: [
        "Neraca ini memakai snapshot data saat ini.",
        "Ekuitas dihitung sebagai total aset dikurangi total liabilitas agar neraca tetap balance.",
        "Penyesuaian ekuitas menampung selisih data historis yang belum dicatat sebagai jurnal akuntansi lengkap.",
      ],
    });
  } catch (error) {
    console.error("Gagal mengambil neraca:", error);
    return res.status(500).json({ message: "Gagal mengambil neraca", error: error.message });
  }
};

