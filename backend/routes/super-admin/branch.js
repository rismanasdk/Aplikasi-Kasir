import express from "express";
import { getSemuaBranch, tambahBranch, hapusBranch, editBranch } from "../../controllers/super-admin/cabangcontroller.js";

const router = express.Router();

router.get("/", getSemuaBranch)
router.post("/", tambahBranch);
router.put("/:id", editBranch);
router.delete("/:id", hapusBranch);

export default router;
