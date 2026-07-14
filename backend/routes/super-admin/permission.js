import { Router } from "express";
import {
  getSemuaPermission,
  getPermissionById,
  tambahPermission,
  editPermission,
  hapusPermission,
} from "../../controllers/super-admin/permissioncontroller.js";

const router = Router();

router.get("/", getSemuaPermission);
router.get("/:id", getPermissionById);
router.post("/", tambahPermission);
router.put("/:id", editPermission);
router.delete("/:id", hapusPermission);

export default router;