import { Router } from "express";
import {
  getAllRoles,
  getSemuaPermission,
  getPermissionById,
} from "../../controllers/super-admin/permissioncontroller.js";

const router = Router();

router.get("/roles", getAllRoles);
router.get("/", getSemuaPermission);
router.get("/:id", getPermissionById);

export default router;