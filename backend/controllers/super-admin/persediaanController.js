import { calculatePersediaanStats } from '../helpers/persediaanHelper.js';

/**
 * GET /api/super-admin/laporan/persediaan
 * Query params: start (YYYY-MM-DD), end (YYYY-MM-DD)
 */
export const getPersediaanSummary = async (req, res) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({
        message: 'start and end query parameters are required (YYYY-MM-DD)',
      });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    const stats = await calculatePersediaanStats(startDate, endDate);
    return res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error('Error getPersediaanSummary:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data persediaan', error: error.message });
  }
};

export default { getPersediaanSummary };
