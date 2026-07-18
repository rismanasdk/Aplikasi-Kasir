import User from "../models/user.js";
import Role from "../models/role.js";
import Branch from "../models/branch.js";
import { PERMISSIONS, PERMISSION_LIST } from "../shared/permissionRegistry.js";

const normalizePermission = (value) => String(value || "").trim();
const LEGACY_ROLE_TO_RBAC_CODE = {
  "super-admin": "super_admin",
  super_admin: "super_admin",
  admin: "admin",
  manajer: "manager",
  manager: "manager",
  kasir: "kasir",
  chef: "chef",
  security: "security",
};

const getUserAuthorizationContext = async (user) => {
  if (!user || !user.id) {
    return null;
  }

  const dbUser = await User.findById(user.id)
    .populate({ path: "role_id", model: Role })
    .populate({ path: "branch_id", model: Branch });

  if (!dbUser) {
    return null;
  }

  let role = dbUser.role_id || null;
  if (!role && dbUser.role) {
    const roleCode = LEGACY_ROLE_TO_RBAC_CODE[String(dbUser.role).toLowerCase()];
    role = roleCode ? await Role.findOne({ code: roleCode }) : null;

    if (role?._id) {
      dbUser.role_id = role._id;
      await User.updateOne({ _id: dbUser._id }, { $set: { role_id: role._id } });
    }
  }

  const permissions = (role?.permissions || []).map((permission) => {
    if (typeof permission === "string") {
      return permission;
    }
    if (permission && typeof permission === "object") {
      return permission.code || permission.name || "";
    }
    return "";
  }).filter(Boolean);

  return {
    userId: dbUser._id.toString(),
    roleId: role?._id?.toString() || null,
    roleName: role?.nama || null,
    branchId: dbUser.branch_id?._id?.toString() || dbUser.branch_id?.toString() || null,
    branchName: dbUser.branch_id?.nama || null,
    permissions,
    permissionVersion: role?.updated_at?.toISOString?.() || null,
  };
};

export const requirePermission = (requiredPermission) => async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "User tidak terotentikasi" });
    }

    const authContext = await getUserAuthorizationContext(req.user);
    if (!authContext) {
      return res.status(401).json({ message: "User tidak ditemukan" });
    }

    req.user.permissions = authContext.permissions;
    req.user.role = authContext.roleName;
    req.user.role_id = authContext.roleId;
    req.user.branch_id = authContext.branchId;
    req.user.branchName = authContext.branchName;
    req.user.permissionVersion = authContext.permissionVersion;

    if (!normalizePermission(requiredPermission)) {
      return next();
    }

    const hasAccess = authContext.permissions.includes(requiredPermission);
    if (!hasAccess) {
      return res.status(403).json({
        message: `Permission '${requiredPermission}' diperlukan`,
        required: requiredPermission,
      });
    }

    next();
  } catch (error) {
    console.error("Authorization error:", error);
    return res.status(500).json({ message: "Gagal memeriksa authorization" });
  }
};

export const requireBranch = (options = {}) => async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "User tidak terotentikasi" });
    }

    const authContext = await getUserAuthorizationContext(req.user);
    if (!authContext) {
      return res.status(401).json({ message: "User tidak ditemukan" });
    }

    req.user.branch_id = authContext.branchId;
    req.user.branchName = authContext.branchName;
    req.user.role_id = authContext.roleId;
    req.user.permissions = authContext.permissions;

    const requestedBranchId = options.branchIdField
      ? req.params?.[options.branchIdField] || req.query?.[options.branchIdField] || req.body?.[options.branchIdField]
      : null;

    const hasGlobalAccess = authContext.permissions.includes(PERMISSIONS.BRANCH_GLOBAL) || authContext.permissions.includes(PERMISSIONS.BRANCH_SWITCH);

    if (!authContext.branchId) {
      return res.status(403).json({ message: "User harus memiliki branch yang valid" });
    }

    if (requestedBranchId && !hasGlobalAccess && String(authContext.branchId) !== String(requestedBranchId)) {
      return res.status(403).json({ message: "Anda tidak memiliki akses ke cabang ini" });
    }

    req.userBranchId = authContext.branchId;
    next();
  } catch (error) {
    console.error("Branch access error:", error);
    return res.status(500).json({ message: "Gagal memeriksa branch access" });
  }
};

export const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "User tidak terotentikasi" });
  }
  next();
};

export const getAllPermissions = () => PERMISSION_LIST;

export default {
  requireAuth,
  requirePermission,
  requireBranch,
};
