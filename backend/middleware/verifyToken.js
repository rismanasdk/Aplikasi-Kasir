import jwt from "jsonwebtoken";

/**
 * Middleware untuk verifikasi JWT token dan inject user identity ke req.user.
 * JWT hanya berfungsi sebagai identity token; otorisasi diproses dari database/cache.
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Token tidak ditemukan" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Token tidak valid" });
    }

    req.user = {
      id: decoded.user_id || decoded.id,
      user_id: decoded.user_id || decoded.id,
      username: decoded.username,
      branch_id: decoded.branch_id || null,
      role_id: decoded.role_id || null,
      role_version: decoded.role_version || null,
      permission_version: decoded.permission_version || null,
      permissions: [],
    };

    next();
  });
};

export default verifyToken;
