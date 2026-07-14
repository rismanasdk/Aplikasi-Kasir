import Role from "../models/role.js";
import User from "../models/user.js";

// Cache for role lookups to avoid repeated DB queries
const roleCache = new Map();

/**
 * Get a role by its code
 * @param {string} code - Role code (e.g., "kasir", "admin", "super_admin")
 * @returns {Promise<Object|null>} Role document or null if not found
 */
export const getRoleByCode = async (code) => {
  if (!code) return null;

  // Check cache first
  const cacheKey = `role:${code}`;
  if (roleCache.has(cacheKey)) {
    return roleCache.get(cacheKey);
  }

  try {
    const role = await Role.findOne({ code: code.toLowerCase() }).populate("permissions");
    if (role) {
      roleCache.set(cacheKey, role);
    }
    return role;
  } catch (error) {
    console.error(`Error fetching role by code "${code}":`, error.message);
    return null;
  }
};

/**
 * Get all users with a specific role code
 * @param {string} roleCode - Role code (e.g., "kasir")
 * @param {Object} filter - Additional MongoDB filter (optional)
 * @returns {Promise<Array>} Array of user documents
 */
export const getUsersByRoleCode = async (roleCode, filter = {}) => {
  try {
    const role = await getRoleByCode(roleCode);
    if (!role) return [];

    const users = await User.find({
      role_id: role._id,
      ...filter,
    });

    return users;
  } catch (error) {
    console.error(`Error fetching users by role code "${roleCode}":`, error.message);
    return [];
  }
};

/**
 * Invalidate role cache (useful after role updates)
 */
export const invalidateRoleCache = () => {
  roleCache.clear();
};

export default {
  getRoleByCode,
  getUsersByRoleCode,
  invalidateRoleCache,
};
