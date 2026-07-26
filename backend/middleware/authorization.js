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
  user: "user",
};

export const getDefaultRolePermissions = (roleCode) => {
  const normalized = String(roleCode || "").trim().toLowerCase();
  return DEFAULT_ROLE_PERMISSIONS[normalized] || [];
};

const DEFAULT_ROLE_PERMISSIONS = {
  super_admin: PERMISSION_LIST,
  admin: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.DASHBOARD_EXPORT,
    PERMISSIONS.TRANSACTION_CREATE,
    PERMISSIONS.TRANSACTION_READ,
    PERMISSIONS.TRANSACTION_UPDATE,
    PERMISSIONS.TRANSACTION_DELETE,
    PERMISSIONS.TRANSACTION_PRINT,
    PERMISSIONS.PRODUCT_CREATE,
    PERMISSIONS.PRODUCT_READ,
    PERMISSIONS.PRODUCT_UPDATE,
    PERMISSIONS.PRODUCT_DELETE,
    PERMISSIONS.STOCK_VIEW,
    PERMISSIONS.STOCK_ADJUST,
    PERMISSIONS.STOCK_TRANSFER,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.REPORT_EXPORT,
    PERMISSIONS.FORECAST_VIEW,
    PERMISSIONS.FORECAST_GENERATE,
    PERMISSIONS.BI_VIEW,
    PERMISSIONS.BRANCH_VIEW,
    PERMISSIONS.BRANCH_CREATE,
    PERMISSIONS.BRANCH_UPDATE,
    PERMISSIONS.BRANCH_DELETE,
    PERMISSIONS.BRANCH_SWITCH,
    PERMISSIONS.ROLE_VIEW,
    PERMISSIONS.ROLE_CREATE,
    PERMISSIONS.ROLE_UPDATE,
    PERMISSIONS.ROLE_DELETE,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.USER_DELETE,
    PERMISSIONS.EMPLOYEE_MANAGE,
    PERMISSIONS.SECURITY_VIEW,
    PERMISSIONS.SECURITY_MANAGE,
  ],
  manager: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.DASHBOARD_EXPORT,
    PERMISSIONS.TRANSACTION_READ,
    PERMISSIONS.TRANSACTION_CREATE,
    PERMISSIONS.PRODUCT_READ,
    PERMISSIONS.STOCK_VIEW,
    PERMISSIONS.STOCK_ADJUST,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.REPORT_EXPORT,
    PERMISSIONS.FORECAST_VIEW,
    PERMISSIONS.FORECAST_GENERATE,
    PERMISSIONS.BI_VIEW,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.BRANCH_VIEW,
  ],
  kasir: [
    PERMISSIONS.TRANSACTION_READ,
    PERMISSIONS.TRANSACTION_PRINT,
    PERMISSIONS.PRODUCT_READ,
    PERMISSIONS.STOCK_VIEW,
  ],
  chef: [
    PERMISSIONS.TRANSACTION_READ,
    PERMISSIONS.PRODUCT_READ,
    PERMISSIONS.STOCK_VIEW,
    PERMISSIONS.STOCK_ADJUST,
    PERMISSIONS.BRANCH_VIEW,
  ],
  security: [
    PERMISSIONS.SECURITY_VIEW,
    PERMISSIONS.DASHBOARD_VIEW,
  ],
  user: [
    PERMISSIONS.TRANSACTION_CREATE,
    PERMISSIONS.TRANSACTION_READ,
    PERMISSIONS.PRODUCT_READ,
  ],
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

  let permissions = (role?.permissions || []).map((permission) => {
    if (typeof permission === "string") {
      return permission;
    }
    if (permission && typeof permission === "object") {
      return permission.code || permission.name || "";
    }
    return "";
  }).filter(Boolean);

  const roleCode = role?.code || LEGACY_ROLE_TO_RBAC_CODE[String(dbUser.role || "").toLowerCase()];
  if (roleCode && DEFAULT_ROLE_PERMISSIONS[roleCode]) {
    permissions = Array.from(new Set([
      ...DEFAULT_ROLE_PERMISSIONS[roleCode],
      ...permissions,
    ]));
  }

  return {
    userId: dbUser._id.toString(),
    roleId: role?._id?.toString() || null,
    roleName: role?.nama || dbUser.role || null,
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
