import { calculateCashflow, getCashBalanceSummary } from "../../controllers/helpers/cashflowHelper.js";

/**
 * Get cashflow summary for a date range
 * GET /api/super-admin/laporan/cashflow
 * Query: startDate, endDate (ISO format)
 */
export const getCashflowSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "startDate and endDate are required (ISO format: YYYY-MM-DD)"
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        message: "Invalid date format. Use ISO format: YYYY-MM-DD"
      });
    }

    const cashflowData = await calculateCashflow(start, end);

    res.json({
      success: true,
      data: cashflowData
    });
  } catch (error) {
    console.error("Error getting cashflow summary:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get cashflow summary",
      error: error.message
    });
  }
};

/**
 * Get current cash balance (quick summary)
 * GET /api/super-admin/laporan/cashflow/balance
 */
export const getCashBalance = async (req, res) => {
  try {
    const balanceSummary = await getCashBalanceSummary();

    res.json({
      success: true,
      data: balanceSummary
    });
  } catch (error) {
    console.error("Error getting cash balance:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get cash balance",
      error: error.message
    });
  }
};
