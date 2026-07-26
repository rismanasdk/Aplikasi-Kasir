import express from "express";
import {  getDashboard, getTopBarang } from "../../controllers/manager/dashboardcontroller.js";

const router = express.Router();

// Endpoint untuk dashboard manager
router.get("/", getDashboard);
// Endpoint untuk top produk terlaris
router.get("/top", getTopBarang);

export default router;
