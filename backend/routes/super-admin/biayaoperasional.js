import express from "express";
import {
	getCategories,
	createCategory,
	updateCategory,
	softDeleteCategory,
} from "../../controllers/super-admin/biayaoperasionalcontroller.js";

const router = express.Router();

// Kategori biaya (master)
router.get("/", getCategories);
router.post("/", createCategory);
router.put("/:id", updateCategory);
router.delete("/:id", softDeleteCategory);

export default router;


