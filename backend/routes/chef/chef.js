import express from "express";
import { 
  getProductions, 
  getAvailableBahanBaku, 
  getAllBahanBaku,
  ambilBahanBaku, 
  updateProductionStatus
} from "../../controllers/chef/chefcontroller.js";
import { requirePermission } from "../../middleware/authorization.js";
import verifyToken from "../../middleware/verifyToken.js";
import { PERMISSIONS } from "../../shared/permissionRegistry.js";

const router = express.Router();

// All routes require authentication and chef role
router.use(verifyToken);
router.use(requirePermission(PERMISSIONS.STOCK_ADJUST));

router.get("/productions", getProductions);
router.get("/bahan-baku/available", getAvailableBahanBaku);
router.get("/bahan-baku", getAllBahanBaku);
router.post("/bahan-baku/ambil", ambilBahanBaku);
router.put("/productions/:id/status", updateProductionStatus);

export default router;
