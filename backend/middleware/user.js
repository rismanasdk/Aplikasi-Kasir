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

    // If token contains username, use it. Otherwise look up from DB by id.
    const setUser = (username) => {
      req.user = {
        id: decoded.id,
        role: decoded.role,
        username: username || null,
      };
      next();
    };

    if (decoded.username) {
      setUser(decoded.username);
    } else {
      User.findById(decoded.id).then(user => {
        setUser(user ? user.username : null);
      }).catch(e => {
        console.warn('userAuth: failed lookup user for username fallback', e.message);
        setUser(null);
      });
    }
  });
};

export default userAuth;
