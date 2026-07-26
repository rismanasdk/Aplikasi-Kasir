import { PERMISSIONS } from "./../shared/permissionRegistry.js";

const normalizeRoleCode = (user, role) => {
  const rawCode = role?.code || user?.role || role?.nama || null;
  if (!rawCode) return null;

  const normalized = String(rawCode).trim().toLowerCase();
  const legacyMap = {
    "super-admin": "super_admin",
    super_admin: "super_admin",
    manajer: "manager",
    manager: "manager",
  };

  return legacyMap[normalized] || normalized;
};

export const buildAuthMePayload = (user, role, branch) => {
  const permissions = (role?.permissions || [])
    .map((permission) => {
      if (typeof permission === "string") return permission;
      if (permission && typeof permission === "object") return permission.code || permission.name || "";
      return "";
    })
    .filter(Boolean);

  return {
    user: {
      id: user?._id?.toString?.() || user?.id || null,
      username: user?.username || null,
      email: user?.email || user?.username || null,
      nama_lengkap: user?.nama_lengkap || null,
      profilePicture: user?.profilePicture || null,
      status: user?.status || null,
    },
    role: {
      id: role?._id?.toString?.() || role?.id || null,
      code: normalizeRoleCode(user, role),
      name: role?.nama || null,
    },
    branch: {
      id: branch?._id?.toString?.() || branch?.id || null,
      name: branch?.nama || null,
    },
    permissions,
  };
};
