import { Router } from "express";
import { proxyBI } from "../controllers/ai-proxy-controller.js";

const router = Router();
router.get("/*", proxyBI);
router.post("/*", proxyBI);

export default router;