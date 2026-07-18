import express from "express";
import { getAllRoles } from "../../controllers/super-admin/setroles.js";

const router = express.Router();

router.get("/", getAllRoles);

export default router;
