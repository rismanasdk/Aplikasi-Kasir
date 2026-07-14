/**
 * Middleware untuk memeriksa branch access
 * Memastikan user memiliki branch_id dan branch tersebut aktif
 */

const requireBranch = () => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User tidak terotentikasi" });
      }

      if (!req.user.branch_id) {
        return res.status(403).json({
          message: "User WAJIB memiliki branch_id yang valid",
        });
      }

      const hasGlobalAccess = (req.user.permissions || []).includes(PERMISSIONS.BRANCH_GLOBAL) || (req.user.permissions || []).includes(PERMISSIONS.BRANCH_SWITCH);
      req.userBranchId = req.user.branch_id;

      if (req.params.branch_id && !hasGlobalAccess && String(req.user.branch_id) !== String(req.params.branch_id)) {
        return res.status(403).json({ message: "Anda tidak memiliki akses ke cabang ini" });
      }

      next();
    } catch (error) {
      console.error("Error in requireBranch:", error);
      return res.status(500).json({ message: "Gagal memeriksa branch access" });
    }
  };
};

export default requireBranch;
