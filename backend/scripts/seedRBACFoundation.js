/**
 * Seeding script untuk RBAC Foundation - Phase 0
 * 
 * Buat branches, permissions, dan roles default
 * 
 * Gunakan: node scripts/seedRBACFoundation.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Branch from "../models/branch.js";
import Permission from "../models/permission.js";
import Role from "../models/role.js";

dotenv.config();

const branchesData = [
  {
    nama: "Pusat",
    alamat: "Jakarta",
    telepon: "+62-212345678",
    status: "aktif",
  },
  {
    nama: "Bandung",
    alamat: "Bandung, Jawa Barat",
    telepon: "+62-274123456",
    status: "aktif",
  },
  {
    nama: "Jakarta",
    alamat: "Jakarta Pusat",
    telepon: "+62-212123456",
    status: "aktif",
  },
  {
    nama: "Bekasi",
    alamat: "Bekasi, Jawa Barat",
    telepon: "+62-218123456",
    status: "aktif",
  },
];

const permissionsData = [
  // Dashboard Permissions
  {
    code: "dashboard.view",
    nama: "Lihat Dashboard",
    modul: "dashboard",
    deskripsi: "Dapat melihat dashboard",
  },
  {
    code: "dashboard.export",
    nama: "Export Dashboard",
    modul: "dashboard",
    deskripsi: "Dapat export data dari dashboard",
  },

  // Transaction Permissions
  {
    code: "transaction.create",
    nama: "Buat Transaksi",
    modul: "transaction",
    deskripsi: "Dapat membuat transaksi baru",
  },
  {
    code: "transaction.read",
    nama: "Lihat Transaksi",
    modul: "transaction",
    deskripsi: "Dapat melihat transaksi",
  },
  {
    code: "transaction.update",
    nama: "Update Transaksi",
    modul: "transaction",
    deskripsi: "Dapat mengupdate transaksi",
  },
  {
    code: "transaction.delete",
    nama: "Hapus Transaksi",
    modul: "transaction",
    deskripsi: "Dapat menghapus transaksi",
  },
  {
    code: "transaction.print",
    nama: "Cetak Transaksi",
    modul: "transaction",
    deskripsi: "Dapat mencetak struk transaksi",
  },

  // Product Permissions
  {
    code: "product.create",
    nama: "Buat Produk",
    modul: "product",
    deskripsi: "Dapat membuat produk baru",
  },
  {
    code: "product.read",
    nama: "Lihat Produk",
    modul: "product",
    deskripsi: "Dapat melihat produk",
  },
  {
    code: "product.update",
    nama: "Update Produk",
    modul: "product",
    deskripsi: "Dapat mengupdate produk",
  },
  {
    code: "product.delete",
    nama: "Hapus Produk",
    modul: "product",
    deskripsi: "Dapat menghapus produk",
  },

  // Stock Permissions
  {
    code: "stock.view",
    nama: "Lihat Stok",
    modul: "stock",
    deskripsi: "Dapat melihat stok",
  },
  {
    code: "stock.adjust",
    nama: "Sesuaikan Stok",
    modul: "stock",
    deskripsi: "Dapat menyesuaikan stok",
  },
  {
    code: "stock.transfer",
    nama: "Transfer Stok",
    modul: "stock",
    deskripsi: "Dapat transfer stok antar cabang",
  },

  // Report Permissions
  {
    code: "report.view",
    nama: "Lihat Laporan",
    modul: "report",
    deskripsi: "Dapat melihat laporan",
  },
  {
    code: "report.export",
    nama: "Export Laporan",
    modul: "report",
    deskripsi: "Dapat export laporan",
  },

  // Forecast & BI Permissions
  {
    code: "forecast.view",
    nama: "Lihat Forecast",
    modul: "forecast",
    deskripsi: "Dapat melihat forecast penjualan",
  },
  {
    code: "forecast.generate",
    nama: "Generate Forecast",
    modul: "forecast",
    deskripsi: "Dapat generate forecast baru",
  },
  {
    code: "bi.view",
    nama: "Lihat BI",
    modul: "bi",
    deskripsi: "Dapat melihat business intelligence",
  },

  // Branch Permissions
  {
    code: "branch.view",
    nama: "Lihat Cabang",
    modul: "branch",
    deskripsi: "Dapat melihat data cabang",
  },
  {
    code: "branch.create",
    nama: "Buat Cabang",
    modul: "branch",
    deskripsi: "Dapat membuat cabang baru",
  },
  {
    code: "branch.update",
    nama: "Update Cabang",
    modul: "branch",
    deskripsi: "Dapat mengupdate cabang",
  },
  {
    code: "branch.delete",
    nama: "Hapus Cabang",
    modul: "branch",
    deskripsi: "Dapat menghapus cabang",
  },
  {
    code: "branch.switch",
    nama: "Ganti Cabang",
    modul: "branch",
    deskripsi: "Dapat mengganti/memilih cabang lain",
  },

  // Role & Permission Permissions
  {
    code: "role.view",
    nama: "Lihat Role",
    modul: "role",
    deskripsi: "Dapat melihat role",
  },
  {
    code: "role.create",
    nama: "Buat Role",
    modul: "role",
    deskripsi: "Dapat membuat role baru",
  },
  {
    code: "role.update",
    nama: "Update Role",
    modul: "role",
    deskripsi: "Dapat mengupdate role",
  },
  {
    code: "role.delete",
    nama: "Hapus Role",
    modul: "role",
    deskripsi: "Dapat menghapus role",
  },
  {
    code: "permission.view",
    nama: "Lihat Permission",
    modul: "permission",
    deskripsi: "Dapat melihat permission",
  },
  {
    code: "permission.manage",
    nama: "Kelola Permission",
    modul: "permission",
    deskripsi: "Dapat mengelola permission",
  },

  // User & Employee Permissions
  {
    code: "user.view",
    nama: "Lihat User",
    modul: "user",
    deskripsi: "Dapat melihat user",
  },
  {
    code: "user.create",
    nama: "Buat User",
    modul: "user",
    deskripsi: "Dapat membuat user baru",
  },
  {
    code: "user.update",
    nama: "Update User",
    modul: "user",
    deskripsi: "Dapat mengupdate user",
  },
  {
    code: "user.delete",
    nama: "Hapus User",
    modul: "user",
    deskripsi: "Dapat menghapus user",
  },
  {
    code: "employee.manage",
    nama: "Kelola Karyawan",
    modul: "employee",
    deskripsi: "Dapat mengelola karyawan",
  },

  // Security Permissions
  {
    code: "security.view",
    nama: "Lihat Security",
    modul: "security",
    deskripsi: "Dapat melihat log keamanan",
  },
  {
    code: "security.manage",
    nama: "Kelola Security",
    modul: "security",
    deskripsi: "Dapat mengelola keamanan",
  },
];

// Define role-permission mappings
const rolePermissionsMap = {
  "Super Admin": [
    // Super Admin punya semua permissions
    ...permissionsData.map((p) => p.code),
  ],
  Admin: [
    // Admin punya semua permissions kecuali permission management
    "dashboard.view",
    "dashboard.export",
    "transaction.create",
    "transaction.read",
    "transaction.update",
    "transaction.delete",
    "transaction.print",
    "product.create",
    "product.read",
    "product.update",
    "product.delete",
    "stock.view",
    "stock.adjust",
    "stock.transfer",
    "report.view",
    "report.export",
    "forecast.view",
    "forecast.generate",
    "bi.view",
    "branch.view",
    "branch.create",
    "branch.update",
    "branch.delete",
    "branch.switch",
    "role.view",
    "role.create",
    "role.update",
    "role.delete",
    "user.view",
    "user.create",
    "user.update",
    "user.delete",
    "employee.manage",
    "security.view",
    "security.manage",
  ],
  Manager: [
    "dashboard.view",
    "dashboard.export",
    "transaction.read",
    "transaction.create",
    "product.read",
    "stock.view",
    "stock.adjust",
    "report.view",
    "report.export",
    "forecast.view",
    "forecast.generate",
    "bi.view",
    "user.view",
  ],
  Kasir: [
    "transaction.create",
    "transaction.read",
    "transaction.print",
    "product.read",
    "stock.view",
  ],
  Chef: [
    "transaction.read",
    "product.read",
    "stock.view",
  ],
  Security: [
    "security.view",
    "dashboard.view",
  ],
};

const seedRBACFoundation = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ Connected to MongoDB");

    // ===== SEED BRANCHES =====
    console.log("\n🌿 Seeding Branches...");
    await Branch.deleteMany({});
    const createdBranches = await Branch.insertMany(branchesData);
    console.log(`✅ Created ${createdBranches.length} branches`);
    createdBranches.forEach((b) =>
      console.log(`   - ${b.nama} (${b._id})`)
    );

    // ===== SEED PERMISSIONS =====
    console.log("\n🔐 Seeding Permissions...");
    await Permission.deleteMany({});
    const createdPermissions = await Permission.insertMany(permissionsData);
    console.log(`✅ Created ${createdPermissions.length} permissions`);

    // Create permission lookup map
    const permissionMap = {};
    createdPermissions.forEach((p) => {
      permissionMap[p.code] = p._id;
    });

    // ===== SEED ROLES =====
    console.log("\n👥 Seeding Roles...");
    await Role.deleteMany({});

    const rolesData = [
      {
        code: "super_admin",
        nama: "Super Admin",
        deskripsi: "Administrator utama dengan akses penuh ke semua cabang",
        tipe: "pusat",
        permissions: rolePermissionsMap["Super Admin"].map((code) => permissionMap[code]),
      },
      {
        code: "admin",
        nama: "Admin",
        deskripsi: "Administrator dengan akses ke semua data",
        tipe: "pusat",
        permissions: rolePermissionsMap["Admin"].map((code) => permissionMap[code]),
      },
      {
        code: "manager",
        nama: "Manager",
        deskripsi: "Manajer cabang dengan akses ke data cabangnya",
        tipe: "cabang",
        permissions: rolePermissionsMap["Manager"].map((code) => permissionMap[code]),
      },
      {
        code: "kasir",
        nama: "Kasir",
        deskripsi: "Kasir dengan akses ke transaksi",
        tipe: "cabang",
        permissions: rolePermissionsMap["Kasir"].map((code) => permissionMap[code]),
      },
      {
        code: "chef",
        nama: "Chef",
        deskripsi: "Chef dapur dengan akses terbatas",
        tipe: "cabang",
        permissions: rolePermissionsMap["Chef"].map((code) => permissionMap[code]),
      },
      {
        code: "security",
        nama: "Security",
        deskripsi: "Staff keamanan dengan akses monitoring",
        tipe: "cabang",
        permissions: rolePermissionsMap["Security"].map((code) => permissionMap[code]),
      },
    ];

    const createdRoles = await Role.insertMany(rolesData);
    console.log(`✅ Created ${createdRoles.length} roles`);
    createdRoles.forEach((r) =>
      console.log(`   - ${r.nama} (${r.permissions.length} permissions)`)
    );

    console.log("\n🎉 RBAC Foundation seeding completed!");
    console.log("\nSummary:");
    console.log(`- Branches: ${createdBranches.length}`);
    console.log(`- Permissions: ${createdPermissions.length}`);
    console.log(`- Roles: ${createdRoles.length}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding RBAC Foundation:", error);
    process.exit(1);
  }
};

seedRBACFoundation();
