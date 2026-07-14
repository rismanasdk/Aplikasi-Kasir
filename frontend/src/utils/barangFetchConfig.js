export const STAFF_ROLES = new Set(['admin', 'super-admin', 'super_admin', 'manajer', 'manager', 'kasir', 'chef']);

export const resolveBarangFetchMode = ({ token, roleCode }) => {
  if (!token) {
    return 'public';
  }

  const normalizedRole = (roleCode || '').toLowerCase();
  return STAFF_ROLES.has(normalizedRole) ? 'authorized' : 'public';
};
