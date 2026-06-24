import express from "express";
import {
  getUsers,
  addUser,
  updateUser,
  deleteUser,
} from "../../controllers/super-admin/usercontroller.js";

const router = express.Router();

// Super-admin full CRUD untuk user management
router.get("/", getUsers);
router.post("/create", addUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;
