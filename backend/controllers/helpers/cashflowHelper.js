import ModalUtama from "../../models/modalutama.js";
import Transaksi from "../../models/datatransaksi.js";
import PengeluaranBiaya from "../../models/pengeluaranbiaya.js";

/**
 * Calculate cashflow for a date range
 * Single source of truth for all cashflow calculations across the app
 * 
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @returns {Promise<Object>} Cashflow data
 * 
 * Returns:
 * {
 *   kas: number,                    // Current cash balance (saldo_kas)
 *   total_modal: number,            // Total modal deposited
 *   sisa_modal: number,             // Remaining modal (modal - prive)
 *   kas_masuk: number,              // Total revenue (completed transactions)
 *   kas_keluar: number,             // Total expenses (operational + withdrawal)
 *   arus_kas_bersih: number,        // Net cash flow (kas_masuk - kas_keluar)
 *   daily_breakdown: Array,         // Daily breakdown [{ date, kas_masuk, kas_keluar, profit }]
 * }
 */
export const calculateCashflow = async (startDate, endDate) => {
  try {
    // 1. Get current modal utama state
    const modal = await ModalUtama.findOne();
    const currentKas = modal?.saldo_kas || 0;
    const totalModal = modal?.total_modal || 0;
    const sisaModal = modal?.sisa_modal || totalModal;

    // 2. Get kas_masuk from completed transactions in date range
    const transaksiBerhasil = await Transaksi.find({
      tanggal_transaksi: {
        $gte: startDate,
        $lte: endDate
      },
      status: "selesai"
    }).lean();

    const kasMasuk = transaksiBerhasil.reduce((sum, t) => {
      return sum + (t.total_harga || 0);
    }, 0);

    // 3. Get kas_keluar from operational expenses (pengeluaran_biaya)
    const pengeluaranData = await PengeluaranBiaya.find({
      tanggal: {
        $gte: startDate,
        $lte: endDate
      }
    }).lean();

    const kasKeluar = pengeluaranData.reduce((sum, p) => {
      return sum + (p.jumlah || 0);
    }, 0);

    // 4. Calculate net cash flow
    const arusKasBersih = kasMasuk - kasKeluar;

    // 5. Build daily breakdown
    const dailyMap = {};
    
    transaksiBerhasil.forEach(t => {
      const dateKey = new Date(t.tanggal_transaksi)
        .toISOString()
        .split('T')[0];
      
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = {
          date: dateKey,
          kas_masuk: 0,
          kas_keluar: 0
        };
      }
      dailyMap[dateKey].kas_masuk += t.total_harga || 0;
    });

    pengeluaranData.forEach(p => {
      const dateKey = new Date(p.tanggal)
        .toISOString()
        .split('T')[0];
      
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = {
          date: dateKey,
          kas_masuk: 0,
          kas_keluar: 0
        };
      }
      dailyMap[dateKey].kas_keluar += p.jumlah || 0;
    });

    const dailyBreakdown = Object.values(dailyMap)
      .map(d => ({
        ...d,
        profit: d.kas_masuk - d.kas_keluar
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    return {
      kas: currentKas,
      total_modal: totalModal,
      sisa_modal: sisaModal,
      kas_masuk: kasMasuk,
      kas_keluar: kasKeluar,
      arus_kas_bersih: arusKasBersih,
      daily_breakdown: dailyBreakdown,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    };
  } catch (error) {
    console.error("Error calculating cashflow:", error);
    throw error;
  }
};

/**
 * Get cash balance summary (for quick queries)
 * Returns only kas, total_modal, sisa_modal without time-range calculations
 */
export const getCashBalanceSummary = async () => {
  try {
    const modal = await ModalUtama.findOne();
    
    return {
      kas: modal?.saldo_kas || 0,
      total_modal: modal?.total_modal || 0,
      sisa_modal: modal?.sisa_modal || 0,
      last_updated: modal?.updatedAt || new Date()
    };
  } catch (error) {
    console.error("Error getting cash balance summary:", error);
    throw error;
  }
};
