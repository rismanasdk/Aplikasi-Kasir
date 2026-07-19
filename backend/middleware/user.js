import jwt from "jsonwebtoken";
import User from "../models/user.js";

const userAuth = (req, res, next) => {
  if (req.path === "/midtrans-callback" || req.path.startsWith("/public/")) {
    return next();
  }

  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ message: "Missing Authorization header" });
  }

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" });
    }

    // Accept multiple token shapes: { id } (google) or { user_id } (legacy)
    const tokenUserId = decoded.id || decoded.user_id || decoded.sub;
    const tokenUsername = decoded.username || decoded.email || null;

    const baseUser = {
      id: tokenUserId,
      role: decoded.role || null,
      username: tokenUsername,
      branch_id: decoded.branch_id || null,
      permissions: Array.isArray(decoded.permissions) ? decoded.permissions : [],
    };

    if (baseUser.id) {
      // try to enrich from DB when possible
      User.findById(baseUser.id).then(user => {
        if (user) {
          req.user = {
            id: user._id,
            role: decoded.role || user.role || null,
            username: user.username || baseUser.username || null,
            branch_id: user.branch_id || baseUser.branch_id || null,
            permissions: user.permissions || baseUser.permissions || [],
          };
        } else {
          req.user = baseUser;
        }
        next();
      }).catch(e => {
        console.warn('userAuth: failed lookup user for enrichment', e.message);
        req.user = baseUser;
        next();
      });
    } else {
      // no id in token — still set whatever we can from token
      req.user = baseUser;
      next();
    }
  });
};

export default userAuth;
