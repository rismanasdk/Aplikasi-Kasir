import express from "express";
import { proxyBI } from "../controllers/ai-proxi-controller.js";

const router = express.Router();

// Tangkap semua request yang masuk ke router ini
router.use(proxyBI);

export default router;