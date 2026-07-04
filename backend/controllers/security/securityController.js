import ServerLog from "../../models/serverLog.js";
import BlockedIP from "../../models/blockedIP.js";
import axios from "axios";
import { buildBranchFilter } from "../../utils/rbacHelper.js";

// Get server logs with filters
export const getServerLogs = async (req, res) => {
  try {
    const {
      ip_address,
      action_type,
      status_code,
      start_date,
      end_date,
      limit = 100,
      page = 1,
      sort = "-timestamp",
    } = req.query;

    const filter = { ...buildBranchFilter(req.user) };

    if (ip_address) {
      filter.ip_address = ip_address;
    }

    if (action_type) {
      filter.action_type = action_type;
    }

    if (status_code) {
      filter.status_code = parseInt(status_code);
    }

    if (start_date || end_date) {
      filter.timestamp = {};
      if (start_date) {
        filter.timestamp.$gte = new Date(start_date);
      }
      if (end_date) {
        filter.timestamp.$lte = new Date(end_date);
      }
    }

    const skip = (page - 1) * limit;
    const logs = await ServerLog.find(filter)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip);

    const total = await ServerLog.countDocuments(filter);

    res.json({
      logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch logs", error: error.message });
  }
};

// Get suspicious activities (failed logins, unauthorized access, etc.)
export const getSuspiciousActivities = async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const suspiciousLogs = await ServerLog.find({
      ...buildBranchFilter(req.user),
      $or: [
        { action_type: "UNAUTHORIZED" },
        { action_type: "FORBIDDEN" },
        { status_code: { $gte: 400, $lt: 500 } },
      ],
    })
      .sort("-timestamp")
      .limit(parseInt(limit))
      .skip(skip);

    const total = await ServerLog.countDocuments({
      ...buildBranchFilter(req.user),
      $or: [
        { action_type: "UNAUTHORIZED" },
        { action_type: "FORBIDDEN" },
        { status_code: { $gte: 400, $lt: 500 } },
      ],
    });

    res.json({
      activities: suspiciousLogs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch suspicious activities", error: error.message });
  }
};

// Get IP statistics
export const getIPStatistics = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const stats = await ServerLog.aggregate([
      {
        $match: {
          ...buildBranchFilter(req.user),
          timestamp: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: "$ip_address",
          total_requests: { $sum: 1 },
          failed_requests: {
            $sum: {
              $cond: [{ $gte: ["$status_code", 400] }, 1, 0],
            },
          },
          last_request: { $max: "$timestamp" },
          user_agents: { $addToSet: "$user_agent" },
        },
      },
      {
        $sort: { total_requests: -1 },
      },
      {
        $limit: 50,
      },
    ]);

    res.json({ statistics: stats });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch IP statistics", error: error.message });
  }
};

// Get blocked IPs
export const getBlockedIPs = async (req, res) => {
  try {
    const { limit = 50, page = 1, status } = req.query;
    const skip = (page - 1) * limit;

    const filter = { ...buildBranchFilter(req.user) };
    if (status) {
      filter.status = status;
    }

    const blockedIPs = await BlockedIP.find(filter)
      .sort("-blocked_at")
      .limit(parseInt(limit))
      .skip(skip);

    const total = await BlockedIP.countDocuments(filter);

    res.json({
      blockedIPs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch blocked IPs", error: error.message });
  }
};

// Block an IP address
export const blockIP = async (req, res) => {
  try {
    const { ip_address, reason, duration_hours } = req.body;

    if (!ip_address) {
      return res.status(400).json({ message: "IP address is required" });
    }

    // Validate IP address format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip_address)) {
      return res.status(400).json({ message: "Invalid IP address format" });
    }

    // Calculate auto_unblock_at if duration is provided
    let auto_unblock_at = null;
    if (duration_hours && duration_hours > 0) {
      auto_unblock_at = new Date(Date.now() + duration_hours * 60 * 60 * 1000);
    }

    const existingBlock = await BlockedIP.findOne({ ip_address, ...buildBranchFilter(req.user) });

    if (existingBlock) {
      if (existingBlock.status === "active") {
        return res.status(400).json({ message: "This IP is already blocked" });
      } else {
        // Reactivate the block
        existingBlock.status = "active";
        existingBlock.blocked_by = req.user.username;
        existingBlock.blocked_at = new Date();
        existingBlock.reason = reason || existingBlock.reason;
        existingBlock.block_type = "manual";
        existingBlock.duration_hours = duration_hours || null;
        existingBlock.auto_unblock_at = auto_unblock_at;
        await existingBlock.save();
        return res.json({ message: "IP block reactivated", blockedIP: existingBlock });
      }
    }

    const newBlockedIP = new BlockedIP({
      ip_address,
      reason: reason || "Suspicious activity",
      branch_id: req.user?.branch_id || null,
      blocked_by: req.user.username,
      block_type: "manual",
      duration_hours: duration_hours || null,
      auto_unblock_at,
    });

    await newBlockedIP.save();

    res.json({ message: "IP address blocked successfully", blockedIP: newBlockedIP });
  } catch (error) {
    res.status(500).json({ message: "Failed to block IP", error: error.message });
  }
};

// Unblock an IP address
export const unblockIP = async (req, res) => {
  try {
    const { ip_address } = req.params;

    if (!ip_address) {
      return res.status(400).json({ message: "IP address is required" });
    }

    const blockedIP = await BlockedIP.findOne({ ip_address, ...buildBranchFilter(req.user) });

    if (!blockedIP) {
      return res.status(404).json({ message: "IP address not found in blocked list" });
    }

    blockedIP.status = "inactive";
    await blockedIP.save();

    res.json({ message: "IP address unblocked successfully", blockedIP });
  } catch (error) {
    res.status(500).json({ message: "Failed to unblock IP", error: error.message });
  }
};

// Get real-time alerts (security events)
export const getRealTimeAlerts = async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const alerts = await ServerLog.find({
      ...buildBranchFilter(req.user),
      timestamp: { $gte: oneHourAgo },
      $or: [
        { status_code: 401 },
        { status_code: 403 },
        { action_type: "UNAUTHORIZED" },
        { action_type: "FORBIDDEN" },
      ],
    })
      .sort("-timestamp")
      .limit(parseInt(limit));

    // Count by IP
    const alertsByIP = {};
    alerts.forEach((alert) => {
      alertsByIP[alert.ip_address] = (alertsByIP[alert.ip_address] || 0) + 1;
    });

    res.json({
      alerts,
      summary: {
        total_alerts: alerts.length,
        alerts_by_ip: alertsByIP,
        last_hour: true,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch alerts", error: error.message });
  }
};

// Get system health
export const getSystemHealth = async (req, res) => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const healthStats = await ServerLog.aggregate([
      {
        $match: {
          ...buildBranchFilter(req.user),
          timestamp: { $gte: oneHourAgo },
        },
      },
      {
        $group: {
          _id: null,
          total_requests: { $sum: 1 },
          errors: {
            $sum: {
              $cond: [{ $gte: ["$status_code", 400] }, 1, 0],
            },
          },
          avg_response_time: { $avg: "$response_time" },
          error_rate: {
            $avg: {
              $cond: [{ $gte: ["$status_code", 400] }, 1, 0],
            },
          },
        },
      },
    ]);

    const data = healthStats[0] || {
      total_requests: 0,
      errors: 0,
      avg_response_time: 0,
      error_rate: 0,
    };

    res.json({
      health: {
        status: data.error_rate < 0.05 ? "healthy" : "degraded",
        total_requests: data.total_requests,
        errors: data.errors,
        error_rate: (data.error_rate * 100).toFixed(2),
        avg_response_time: data.avg_response_time.toFixed(2),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch system health", error: error.message });
  }
};

// Get blocked IP details
export const getBlockedIPDetail = async (req, res) => {
  try {
    const { ip_address } = req.params;

    const blockedIP = await BlockedIP.findOne({ ip_address, ...buildBranchFilter(req.user) });

    if (!blockedIP) {
      return res.status(404).json({ message: "IP address not found in blocked list" });
    }

    // Get logs for this IP
    const logs = await ServerLog.find({ ip_address, ...buildBranchFilter(req.user) })
      .sort("-timestamp")
      .limit(50);

    res.json({
      blockedIP,
      logs,
      statistics: {
        total_requests: logs.length,
        failed_requests: logs.filter((l) => l.status_code >= 400).length,
        action_types: [...new Set(logs.map((l) => l.action_type))],
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch IP details", error: error.message });
  }
};

// Update blocked IP reason
export const updateBlockedIPReason = async (req, res) => {
  try {
    const { ip_address } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ message: "Reason is required" });
    }

    const blockedIP = await BlockedIP.findOne({ ip_address, ...buildBranchFilter(req.user) });

    if (!blockedIP) {
      return res.status(404).json({ message: "IP address not found in blocked list" });
    }

    blockedIP.reason = reason;
    await blockedIP.save();

    res.json({ message: "Reason updated successfully", blockedIP });
  } catch (error) {
    res.status(500).json({ message: "Failed to update reason", error: error.message });
  }
};
