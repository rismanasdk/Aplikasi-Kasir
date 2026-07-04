import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../models/user.js";
import Role from "../models/role.js";
import Branch from "../models/branch.js";
import connectDB from "../database/db.js";

const createTestChef = async () => {
  try {
    await connectDB();
    console.log("Connected to database");

    // Check if test chef already exists
    const existingChef = await User.findOne({ username: "testchef" });
    if (existingChef) {
      console.log("Test chef already exists");
      return;
    }

    // Get chef role
    const chefRole = await Role.findOne({ code: "chef" });
    if (!chefRole) {
      console.error("Chef role not found. Please seed RBAC foundation first.");
      process.exit(1);
    }

    // Get default branch (Pusat)
    const pusat = await Branch.findOne({ nama: "Pusat" });
    if (!pusat) {
      console.error("Pusat branch not found. Please seed RBAC foundation first.");
      process.exit(1);
    }

    // Create test chef
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("12345678", salt);

    const testChef = new User({
      nama_lengkap: "Test Chef",
      username: "testchef",
      password: hashedPassword,
      status: "aktif",
      role_id: chefRole._id,
      branch_id: pusat._id,
      role: "chef", // legacy field for compatibility
      profilePicture: "https://example.com/chef.jpg"
    });

    await testChef.save();
    console.log("Test chef created successfully");
    console.log("Username: testchef");
    console.log("Password: 12345678");
    console.log("Role: Chef");
    console.log("Branch: Pusat");

    process.exit(0);
  } catch (error) {
    console.error("Error creating test chef:", error);
    process.exit(1);
  }
};

createTestChef();