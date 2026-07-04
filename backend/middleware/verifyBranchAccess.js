/**
 * Middleware untuk memeriksa branch ownership
 * Pastikan user hanya bisa mengakses data dari branch mereka sendiri
 * 
 * Gunakan: router.get("/endpoint/:id", verifyToken, requireBranch(), verifyBranchAccess("branch_id"), controller)
 */

const verifyBranchAccess = (branchIdField = "branch_id") => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User tidak terotentikasi" });
      }

      const permissionCodes = Array.isArray(req.user.permissions) ? req.user.permissions : [];
      const hasGlobalAccess = permissionCodes.includes(PERMISSIONS.BRANCH_GLOBAL) || permissionCodes.includes(PERMISSIONS.BRANCH_SWITCH);

      let resourceBranchId = null;
      if (req.params[branchIdField]) {
        resourceBranchId = req.params[branchIdField];
      } else if (req.query[branchIdField]) {
        resourceBranchId = req.query[branchIdField];
      } else if (req.body && req.body[branchIdField]) {
        resourceBranchId = req.body[branchIdField];
      }

      if (!resourceBranchId) {
        return res.status(400).json({ message: `Resource harus memiliki ${branchIdField}` });
      }

      if (!hasGlobalAccess && req.user.branch_id && req.user.branch_id.toString() !== resourceBranchId.toString()) {
        return res.status(403).json({
          message: "Anda tidak memiliki akses ke cabang ini",
          userBranch: req.user.branch_id,
          requestedBranch: resourceBranchId,
        });
      }

      next();
    } catch (error) {
      console.error("Error in verifyBranchAccess:", error);
      return res.status(500).json({ message: "Gagal memeriksa branch access" });
    }
  };
};

export default verifyBranchAccess;
