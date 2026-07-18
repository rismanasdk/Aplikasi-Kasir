import mongoose from "mongoose";
import dotenv from "dotenv";
import Branch from "../models/branch.js";
import Permission from "../models/permission.js";
import Role from "../models/role.js";
import User from "../models/user.js";
import { PERMISSION_DEFINITIONS } from "./../shared/permissionRegistry.js";

dotenv.config();

const rolePermissionsMap = {
  super_admin: PERMISSION_DEFINITIONS.map((permission) => permission.code),
  admin: [
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
  manager: [
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
  kasir: [
    "transaction.create",
    "transaction.read",
    "transaction.print",
    "product.read",
    "stock.view",
  ],
  chef: [
    "transaction.read",
    "product.read",
    "stock.view",
  ],
  security: [
    "security.view",
    "dashboard.view",
  ],
};

const roleMeta = {
  super_admin: { nama: "Super Admin", tipe: "pusat", deskripsi: "Administrator utama dengan akses penuh" },
  admin: { nama: "Admin", tipe: "pusat", deskripsi: "Administrator dengan akses operasional penuh" },
  manager: { nama: "Manager", tipe: "cabang", deskripsi: "Manajer cabang" },
  kasir: { nama: "Kasir", tipe: "cabang", deskripsi: "Kasir transaksi" },
  chef: { nama: "Chef", tipe: "cabang", deskripsi: "Staff dapur" },
  security: { nama: "Security", tipe: "cabang", deskripsi: "Staff keamanan" },
};

const legacyRoleToCode = {
  "super-admin": "super_admin",
  super_admin: "super_admin",
  admin: "admin",
  manajer: "manager",
  manager: "manager",
  kasir: "kasir",
  chef: "chef",
  security: "security",
};

const repairRBAC = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const pusat = await Branch.findOneAndUpdate(
    { nama: "Pusat" },
    { $setOnInsert: { nama: "Pusat", alamat: "Jakarta", telepon: "", status: "aktif" } },
    { new: true, upsert: true }
  );

  const permissionByCode = new Map();
  for (const permission of PERMISSION_DEFINITIONS) {
    const doc = await Permission.findOneAndUpdate(
      { code: permission.code },
      { $set: permission },
      { new: true, upsert: true }
    );
    permissionByCode.set(permission.code, doc._id);
  }

  const roleByCode = new Map();
  for (const [code, permissionCodes] of Object.entries(rolePermissionsMap)) {
    const permissionIds = permissionCodes.map((permissionCode) => permissionByCode.get(permissionCode)).filter(Boolean);
    const meta = roleMeta[code];
    const role = await Role.findOneAndUpdate(
      { code },
      {
        $set: {
          code,
          nama: meta.nama,
          deskripsi: meta.deskripsi,
          tipe: meta.tipe,
          status: "aktif",
          permissions: permissionIds,
        },
      },
      { new: true, upsert: true }
    );
    roleByCode.set(code, role._id);
  }

  let repairedUsers = 0;
  const users = await User.find({});
  for (const user of users) {
    const updates = {};

    if (!user.branch_id) {
      updates.branch_id = pusat._id;
    }

    if (!user.role_id) {
      const roleCode = legacyRoleToCode[String(user.role || "").toLowerCase()];
      const roleId = roleCode ? roleByCode.get(roleCode) : null;
      if (roleId) {
        updates.role_id = roleId;
      }
    }

    if (Object.keys(updates).length) {
      await User.updateOne({ _id: user._id }, { $set: updates });
      repairedUsers += 1;
    }
  }

  console.log(`RBAC repair selesai. Permissions: ${permissionByCode.size}, Roles: ${roleByCode.size}, Users repaired: ${repairedUsers}`);
  await mongoose.disconnect();
};

repairRBAC().catch(async (error) => {
  console.error("RBAC repair gagal:", error);
  await mongoose.disconnect();
  process.exit(1);
});
