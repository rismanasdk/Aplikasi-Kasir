import User from "../models/user.js";
import Role from "../models/role.js";
import { PERMISSIONS, PERMISSION_LIST } from "../../shared/permissionRegistry.js";

const normalizePermission = (value) => String(value || "").trim();

const getUserAuthorizationContext = async (req) => {
  const userId = req.user?.id || req.user?.user_id;
  if (!userId) {
    return null;
  }

  const dbUser = await User.findById(userId).populate({ path: "role_id", model: Role });
  if (!dbUser) {
    return null;
  }

  const role = dbUser.role_id || null;
  const permissions = (role?.permissions || [])
    .map((permission) => {
      if (typeof permission === "string") return permission;
      if (permission && typeof permission === "object") return permission.code || permission.name || "";
      return "";
    })
    .filter(Boolean);

  return {
    roleName: role?.nama || null,
    permissions,
  };
};

const authorize = (permissions = []) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User tidak terotentikasi" });
      }

      const requiredPermissions = permissions
        .map(normalizePermission)
        .filter(Boolean);

      if (!requiredPermissions.length) {
        return next();
      }

      const authContext = await getUserAuthorizationContext(req);
      const effectivePermissions = Array.isArray(req.user.permissions) && req.user.permissions.length
        ? req.user.permissions.map((permission) => (typeof permission === "string" ? permission : permission?.code || "")).filter(Boolean)
        : authContext?.permissions || [];

      const hasRequiredPermissions = requiredPermissions.every((permission) => effectivePermissions.includes(permission));
      if (hasRequiredPermissions) {
        req.user.permissions = effectivePermissions;
        req.user.role = authContext?.roleName || req.user.role || null;
        req.user.role_id = req.user.role_id || null;
        req.user.branch_id = req.user.branch_id || null;
        return next();
      }

      return res.status(403).json({
        message: "Access denied",
        requiredPermissions,
        availablePermissions: effectivePermissions,
      });
    } catch (error) {
      console.error("Authorization middleware error:", error);
      return res.status(500).json({ message: "Gagal memeriksa authorization" });
    }
  };
};

export const getAllPermissions = () => PERMISSION_LIST;
export default authorize;
