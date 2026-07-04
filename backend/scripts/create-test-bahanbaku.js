import mongoose from "mongoose";
import bcrypt from "bcrypt";
import BahanBaku from "../models/bahanbaku.js";
import User from "../models/user.js";
import Role from "../models/role.js";
import Branch from "../models/branch.js";
import connectDB from "../database/db.js";

const createTestBahanBaku = async () => {
  try {
    await connectDB();
    console.log("Connected to database");

    // Clear existing test data
    await BahanBaku.deleteMany({ nama: { $regex: /^Test/ } });
    console.log("Cleared existing test bahan baku");

    // Create test bahan baku
    const testBahanBaku = [
      {
        nama: "Test Ayam Fillet",
        kategori: "Protein",
        stok: 50,
        satuan: "kg",
        harga_beli: 80000,
        harga_jual: 120000,
        deskripsi: "Ayam fillet segar untuk bahan baku",
        gambar_url: "https://example.com/ayam-fillet.jpg",
        status: "pending",
        is_bahan_siapp: false
      },
      {
        nama: "Test Tepung Terigu",
        kategori: "Bahan Pokok",
        stok: 100,
        satuan: "kg",
        harga_beli: 15000,
        harga_jual: 25000,
        deskripsi: "Tepung terigu protein tinggi",
        gambar_url: "https://example.com/tepung-terigu.jpg",
        status: "pending",
        is_bahan_siapp: false
      },
      {
        nama: "Test Minyak Goreng",
        kategori: "Bahan Pokok",
        stok: 200,
        satuan: "liter",
        harga_beli: 20000,
        harga_jual: 30000,
        deskripsi: "Minyak goreng premium",
        gambar_url: "https://example.com/minyak-goreng.jpg",
        status: "pending",
        is_bahan_siapp: false
      },
      {
        nama: "Test Bawang Merah",
        kategori: "Bumbu",
        stok: 30,
        satuan: "kg",
        harga_beli: 40000,
        harga_jual: 60000,
        deskripsi: "Bawang merah segar",
        gambar_url: "https://example.com/bawang-merah.jpg",
        status: "pending",
        is_bahan_siapp: false
      },
      {
        nama: "Test Cabai Rawit",
        kategori: "Bumbu",
        stok: 20,
        satuan: "kg",
        harga_beli: 50000,
        harga_jual: 75000,
        deskripsi: "Cabai rawit pedas",
        gambar_url: "https://example.com/cabai-rawit.jpg",
        status: "pending",
        is_bahan_siapp: false
      }
    ];

    const createdBahanBaku = await BahanBaku.insertMany(testBahanBaku);
    console.log("Created test bahan baku:", createdBahanBaku.length);

    // Get or create chef user
    const chefRole = await Role.findOne({ code: "chef" });
    const pusat = await Branch.findOne({ nama: "Pusat" });

    if (!chefRole || !pusat) {
      console.error("Chef role or Pusat branch not found. Please seed RBAC foundation first.");
      process.exit(1);
    }

    let chef = await User.findOne({ username: "testchef" });
    if (!chef) {
      console.log("No chef user found, creating test chef");
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("12345678", salt);

      chef = new User({
        nama_lengkap: "Test Chef",
        username: "testchef",
        password: hashedPassword,
        status: "aktif",
        role_id: chefRole._id,
        branch_id: pusat._id,
        role: "chef", // legacy field
        profilePicture: "https://example.com/chef.jpg"
      });

      await chef.save();
      console.log("Test chef created");
    }

    console.log("Using chef:", chef.username);

    console.log("Test data creation completed");
    process.exit(0);
  } catch (error) {
    console.error("Error creating test data:", error);
    process.exit(1);
  }
};

createTestBahanBaku();