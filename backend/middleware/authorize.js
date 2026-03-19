//middleware/authorize.js

const authorize = (roles = []) => {
  return (req, res, next) => {
    const normalizeRole = (role) => String(role || "").trim().toLowerCase();
    const allowedRoles = roles.map(normalizeRole);
    const userRole = normalizeRole(req.user?.role);

    if (!req.user || (allowedRoles.length && !allowedRoles.includes(userRole))) {
      return res.status(403).json({
        message: "Access denied",
        requiredRoles: allowedRoles,
        currentRole: userRole || null,
      });
    }
    next();
  };
};

export default authorize;
