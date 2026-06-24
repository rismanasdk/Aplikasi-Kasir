import express from "express";
import verifyToken from "../middleware/verifyToken.js";
import ServerLog from "../models/serverLog.js";

const router = express.Router();

// POST /api/log/page-view
router.post("/page-view", verifyToken, async (req, res) => {
  try {
    const { page_name, page_url } = req.body;

    if (!page_name) {
      return res.status(400).json({ message: "Page name is required" });
    }

    await ServerLog.create({
      ip_address: req.ip || req.connection.remoteAddress || "unknown",
      method: "PAGE_VIEW", // Custom method biar mudah dibedakan
      url: page_url || page_name,
      status_code: 200,
      response_time: 0,
      user_agent: req.get("user-agent") || null,
      user_id: req.user?._id || null,
      username: req.user?.username || null,
      action_type: "PAGE_VIEW",
      details: { page_name },
    });

    res.json({ message: "Page view logged" });
  } catch (error) {
    res.status(500).json({ message: "Failed to log page view" });
  }
});

export default router;