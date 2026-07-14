import Transaksi from "../../models/datatransaksi.js";
import { buildBranchFilter } from "../../utils/rbacHelper.js";

// Get daily cash flow report
export const getDailyCashFlow = async (req, res) => {
  try {
    const { date } = req.query;
    
    // Use provided date or today
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    // Get all transactions for the day
    const transactions = await Transaksi.find({
      ...buildBranchFilter(req.user),
      tanggal_transaksi: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    });

    // Calculate summary metrics
    const summary = {
      totalTransactions: transactions.length,
      completedCount: 0,
      canceledCount: 0,
      pendingCount: 0,
      totalRevenue: 0,
      totalCost: 0,
      profit: 0,
      paymentMethods: {},
      hourlyBreakdown: {}
    };

    // Initialize payment methods tracking
    const paymentMethodsSet = new Set(transactions.map(t => t.metode_pembayaran));
    paymentMethodsSet.forEach(method => {
      summary.paymentMethods[method] = {
        count: 0,
        amount: 0,
        percentage: 0
      };
    });

    // Process each transaction
    transactions.forEach((transaction) => {
      // Status counts
      if (transaction.status === "selesai") {
        summary.completedCount++;
        summary.totalRevenue += transaction.total_harga || 0;
      } else if (transaction.status === "dibatalkan") {
        summary.canceledCount++;
      } else {
        summary.pendingCount++;
      }

      // Payment method tracking (only completed)
      if (transaction.status === "selesai") {
        const method = transaction.metode_pembayaran;
        if (summary.paymentMethods[method]) {
          summary.paymentMethods[method].count++;
          summary.paymentMethods[method].amount += transaction.total_harga || 0;
        }
      }

      // Calculate cost from items
      if (transaction.barang_dibeli && Array.isArray(transaction.barang_dibeli)) {
        transaction.barang_dibeli.forEach(item => {
          summary.totalCost += (item.harga_beli || 0) * item.jumlah;
        });
      }

      // Hourly breakdown
      const hour = new Date(transaction.tanggal_transaksi).getHours();
      if (!summary.hourlyBreakdown[hour]) {
        summary.hourlyBreakdown[hour] = {
          count: 0,
          amount: 0
        };
      }
      if (transaction.status === "selesai") {
        summary.hourlyBreakdown[hour].count++;
        summary.hourlyBreakdown[hour].amount += transaction.total_harga || 0;
      }
    });

    // Calculate profit
    summary.profit = summary.totalRevenue - summary.totalCost;

    // Calculate percentages
    Object.keys(summary.paymentMethods).forEach(method => {
      if (summary.totalRevenue > 0) {
        summary.paymentMethods[method].percentage = 
          (summary.paymentMethods[method].amount / summary.totalRevenue) * 100;
      }
    });

    // Calculate success rate
    summary.successRate = summary.totalTransactions > 0 
      ? (summary.completedCount / summary.totalTransactions) * 100 
      : 0;

    // Convert hourlyBreakdown object to sorted array
    summary.hourlyBreakdownArray = Object.keys(summary.hourlyBreakdown)
      .map(hour => ({
        hour: parseInt(hour),
        ...summary.hourlyBreakdown[hour]
      }))
      .sort((a, b) => a.hour - b.hour);

    // Get recent transactions for detail table
    const recentTransactions = transactions
      .sort((a, b) => b.tanggal_transaksi - a.tanggal_transaksi)
      .slice(0, 50)
      .map(t => ({
        _id: t._id,
        nomor_transaksi: t.nomor_transaksi,
        tanggal_transaksi: t.tanggal_transaksi,
        status: t.status,
        metode_pembayaran: t.metode_pembayaran,
        total_harga: t.total_harga,
        kasir_id: t.kasir_id,
        itemCount: t.barang_dibeli?.length || 0
      }));

    res.json({
      success: true,
      data: {
        date: targetDate.toISOString().split('T')[0],
        summary,
        recentTransactions,
        fullData: transactions // For potential export
      }
    });
  } catch (error) {
    console.error("Error getting daily cash flow:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to get cash flow report", 
      error: error.message 
    });
  }
};

// Get cash flow for date range
export const getCashFlowRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ 
        message: "startDate and endDate are required" 
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const transactions = await Transaksi.find({
      ...buildBranchFilter(req.user),
      tanggal_transaksi: {
        $gte: start,
        $lte: end
      },
      status: "selesai"
    });

    // Group by day
    const dailyData = {};
    transactions.forEach(t => {
      const dateKey = t.tanggal_transaksi.toISOString().split('T')[0];
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          date: dateKey,
          count: 0,
          amount: 0,
          cost: 0
        };
      }
      dailyData[dateKey].count++;
      dailyData[dateKey].amount += t.total_harga || 0;
      
      if (t.barang_dibeli && Array.isArray(t.barang_dibeli)) {
        t.barang_dibeli.forEach(item => {
          dailyData[dateKey].cost += (item.harga_beli || 0) * item.jumlah;
        });
      }
    });

    // Convert to array and sort
    const dailyArray = Object.values(dailyData)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(d => ({
        ...d,
        profit: d.amount - d.cost
      }));

    // Calculate totals
    const totals = {
      totalCount: dailyArray.reduce((sum, d) => sum + d.count, 0),
      totalAmount: dailyArray.reduce((sum, d) => sum + d.amount, 0),
      totalCost: dailyArray.reduce((sum, d) => sum + d.cost, 0),
      totalProfit: 0
    };
    totals.totalProfit = totals.totalAmount - totals.totalCost;

    res.json({
      success: true,
      data: {
        startDate,
        endDate,
        dailyArray,
        totals
      }
    });
  } catch (error) {
    console.error("Error getting cash flow range:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to get cash flow range", 
      error: error.message 
    });
  }
};

// Get payment methods summary
export const getPaymentMethodsSummary = async (req, res) => {
  try {
    const { date } = req.query;

    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const transactions = await Transaksi.find({
      tanggal_transaksi: {
        $gte: startOfDay,
        $lt: endOfDay
      },
      status: "selesai"
    });

    const methods = {};
    transactions.forEach(t => {
      const method = t.metode_pembayaran;
      if (!methods[method]) {
        methods[method] = {
          method,
          count: 0,
          amount: 0,
          avgTransaction: 0
        };
      }
      methods[method].count++;
      methods[method].amount += t.total_harga || 0;
    });

    // Calculate averages
    Object.keys(methods).forEach(method => {
      methods[method].avgTransaction = methods[method].count > 0 
        ? methods[method].amount / methods[method].count 
        : 0;
    });

    const methodsArray = Object.values(methods)
      .sort((a, b) => b.amount - a.amount);

    res.json({
      success: true,
      data: methodsArray
    });
  } catch (error) {
    console.error("Error getting payment methods summary:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to get payment methods summary", 
      error: error.message 
    });
  }
};

// Get best selling items for the day
export const getBestSellingItems = async (req, res) => {
  try {
    const { date } = req.query;

    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const transactions = await Transaksi.find({
      tanggal_transaksi: {
        $gte: startOfDay,
        $lt: endOfDay
      },
      status: "selesai"
    });

    const items = {};
    transactions.forEach(t => {
      if (t.barang_dibeli && Array.isArray(t.barang_dibeli)) {
        t.barang_dibeli.forEach(item => {
          if (!items[item.kode_barang]) {
            items[item.kode_barang] = {
              kode: item.kode_barang,
              nama: item.nama_barang,
              quantity: 0,
              revenue: 0,
              cost: 0
            };
          }
          items[item.kode_barang].quantity += item.jumlah;
          items[item.kode_barang].revenue += item.subtotal;
          items[item.kode_barang].cost += (item.harga_beli * item.jumlah);
        });
      }
    });

    const itemsArray = Object.values(items)
      .map(item => ({
        ...item,
        profit: item.revenue - item.cost
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    res.json({
      success: true,
      data: itemsArray
    });
  } catch (error) {
    console.error("Error getting best selling items:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to get best selling items", 
      error: error.message 
    });
  }
};
