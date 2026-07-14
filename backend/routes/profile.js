import express from "express";
import upload from "../middleware/upload.js";
import { updateUserProfilePicture } from "../controllers/profilecontroller.js";
import userMiddleware from "../middleware/user.js";
import { updateUser } from "../controllers/profilecontroller.js";
import { getUserProfilePicture } from "../controllers/profilecontroller.js";


const router = express.Router();

// User update foto profile sendiri
router.put(
  "/user/:userId/profile-picture",
  userMiddleware, // jangan pakai ()
  upload.single("profilePicture"),
  updateUserProfilePicture
);

router.put("/user/:id", userMiddleware, updateUser)
router.get("/", userMiddleware, getUserProfilePicture);
router.get("", userMiddleware, getUserProfilePicture);
router.get("/me", userMiddleware, getUserProfilePicture);

export default router;