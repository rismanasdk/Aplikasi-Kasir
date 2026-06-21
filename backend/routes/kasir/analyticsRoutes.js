import express from "express";
import verifyToken from "../../middleware/verifyToken.js";
import authorize from "../../middleware/authorize.js";
import {
  getDailyCashFlow,
  getCashFlowRange,
  getPaymentMethodsSummary,
  getBestSellingItems
} from "../../controllers/kasir/cashFlowController.js";

const router = express.Router();

// All kasir routes require authentication and kasir role
router.use(verifyToken);
router.use(authorize(["kasir", "admin"]));

// Daily cash flow report
router.get("/daily-cash-flow", getDailyCashFlow);

// Cash flow range (for weekly/monthly reports)
router.get("/cash-flow-range", getCashFlowRange);

// Payment methods summary
router.get("/payment-methods", getPaymentMethodsSummary);

// Best selling items
router.get("/best-selling-items", getBestSellingItems);

export default router;
