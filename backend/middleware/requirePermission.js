/**
 * Middleware untuk memeriksa permission user
 * Gunakan: router.get("/endpoint", verifyToken, requirePermission("module.action"), controller)
 */

const requirePermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User tidak terotentikasi" });
      }

      const permissionCodes = Array.isArray(req.user.permissions)
        ? req.user.permissions.map((p) => p.code || p)
        : [];

      if (!permissionCodes.includes(requiredPermission)) {
        return res.status(403).json({
          message: `Permission '${requiredPermission}' diperlukan`,
          required: requiredPermission,
          current: permissionCodes,
        });
      }

      next();
    } catch (error) {
      console.error("Error in requirePermission:", error);
      return res.status(500).json({ message: "Gagal memeriksa permission" });
    }
  };
};

export default requirePermission;
