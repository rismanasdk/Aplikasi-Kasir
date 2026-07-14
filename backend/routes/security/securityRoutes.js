import express from "express";
import verifyToken from "../../middleware/verifyToken.js";
import { requirePermission } from "../../middleware/authorization.js";
import { PERMISSIONS } from "../../../shared/permissionRegistry.js";
import {
  getServerLogs,
  getSuspiciousActivities,
  getIPStatistics,
  getBlockedIPs,
  blockIP,
  unblockIP,
  getRealTimeAlerts,
  getSystemHealth,
  getBlockedIPDetail,
  updateBlockedIPReason,
} from "../../controllers/security/securityController.js";

const router = express.Router();

// All routes require authentication and security role
router.use(verifyToken);
router.use(requirePermission(PERMISSIONS.SECURITY_VIEW));

// Logs and monitoring
router.get("/logs", getServerLogs);
router.get("/suspicious-activities", getSuspiciousActivities);
router.get("/ip-statistics", getIPStatistics);
router.get("/real-time-alerts", getRealTimeAlerts);
router.get("/system-health", getSystemHealth);

// Blocked IPs management
router.get("/blocked-ips", getBlockedIPs);
router.post("/blocked-ips", blockIP);
router.delete("/blocked-ips/:ip_address", unblockIP);
router.put("/blocked-ips/:ip_address", updateBlockedIPReason);
router.get("/blocked-ips/:ip_address", getBlockedIPDetail);

export default router;
