/**
 * Utility functions untuk RBAC dan Branch Isolation
 * 
 * Gunakan fungsi-fungsi ini di controller untuk membangun query yang sesuai dengan branch user
 */
import { PERMISSIONS } from "./../shared/permissionRegistry.js";

/**
 * Build query filter berdasarkan user role dan branch_id
 * 
 * @param {Object} user - User object dari req.user
 * @param {String} resourceBranchIdField - Field name untuk branch_id di document (default: "branch_id")
 * @returns {Object} MongoDB filter object
 * 
 * Contoh:
 * const filter = buildBranchFilter(req.user);
 * const transactions = await Transaksi.find(filter);
 */
export const buildBranchFilter = (user, resourceBranchIdField = "branch_id") => {
  const permissionCodes = Array.isArray(user?.permissions) ? user.permissions : [];
  const hasGlobalAccess = permissionCodes.includes(PERMISSIONS.BRANCH_GLOBAL) || permissionCodes.includes(PERMISSIONS.BRANCH_SWITCH);

  if (!user || hasGlobalAccess) {
    return {};
  }

  if (user.branch_id) {
    return {
      [resourceBranchIdField]: user.branch_id,
    };
  }

  return {
    [resourceBranchIdField]: { $exists: true },
  };
};

/**
 * Check apakah user bisa akses resource dari branch tertentu
 * 
 * @param {Object} user - User object dari req.user
 * @param {String} resourceBranchId - Branch ID dari resource yang ingin diakses
 * @returns {Boolean} true jika user bisa akses, false sebaliknya
 */
export const canAccessBranch = (user, resourceBranchId) => {
  if (!user) return false;

  const permissionCodes = Array.isArray(user?.permissions) ? user.permissions : [];
  const hasGlobalAccess = permissionCodes.includes(PERMISSIONS.BRANCH_GLOBAL) || permissionCodes.includes(PERMISSIONS.BRANCH_SWITCH);
  if (hasGlobalAccess) {
    return true;
  }

  if (user.branch_id && resourceBranchId && user.branch_id.toString() === resourceBranchId.toString()) {
    return true;
  }

  return false;
};

/**
 * Check apakah user punya permission tertentu
 * 
 * @param {Object} user - User object dari req.user
 * @param {String} permissionCode - Permission code to check (e.g., "transaction.create")
 * @returns {Boolean} true jika user punya permission, false sebaliknya
 */
export const hasPermission = (user, permissionCode) => {
  if (!user) return false;

  if (user.permissions && Array.isArray(user.permissions)) {
    return user.permissions.some((p) => {
      return (typeof p === "string" ? p : p.code) === permissionCode;
    });
  }

  return false;
};

/**
 * Build aggregation pipeline stage untuk branch filtering
 * Gunakan untuk aggregation queries
 * 
 * @param {Object} user - User object dari req.user
 * @param {String} branchIdField - Field name untuk branch_id (default: "branch_id")
 * @returns {Object} MongoDB $match stage
 */
export const buildBranchMatchStage = (user, branchIdField = "branch_id") => {
  const branchFilter = buildBranchFilter(user, branchIdField);
  return { $match: branchFilter };
};

/**
 * Validate dan inject branch_id ke request body
 * 
 * @param {Object} req - Express request object
 * @param {Boolean} required - Apakah branch_id wajib di request (default: false)
 * @returns {Object} { isValid: boolean, branchId: string|null, error: string|null }
 */
export const validateAndInjectBranch = (req, required = false) => {
  const permissionCodes = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
  const hasGlobalAccess = permissionCodes.includes(PERMISSIONS.BRANCH_GLOBAL) || permissionCodes.includes(PERMISSIONS.BRANCH_SWITCH);

  if (hasGlobalAccess) {
    if (req.body.branch_id && req.body.branch_id !== req.user.branch_id?.toString()) {
      req.body.branch_id = req.user.branch_id || req.body.branch_id;
    } else if (!req.body.branch_id && req.user.branch_id) {
      req.body.branch_id = req.user.branch_id;
    }

    return {
      isValid: true,
      branchId: req.body.branch_id || req.user.branch_id || null,
    };
  }

  if (!req.user.branch_id) {
    return {
      isValid: false,
      branchId: null,
      error: "User harus memiliki branch_id",
    };
  }

  if (req.body.branch_id && req.body.branch_id !== req.user.branch_id.toString()) {
    return {
      isValid: false,
      branchId: null,
      error: "Anda tidak bisa mengubah branch_id",
    };
  }

  req.body.branch_id = req.user.branch_id;

  return {
    isValid: true,
    branchId: req.user.branch_id,
  };
};

export default {
  buildBranchFilter,
  canAccessBranch,
  hasPermission,
  buildBranchMatchStage,
  validateAndInjectBranch,
};
