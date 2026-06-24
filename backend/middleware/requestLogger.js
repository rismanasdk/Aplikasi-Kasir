import ServerLog from "../models/serverLog.js";

export const requestLogger = async (req, res, next) => {
  const startTime = Date.now();

  res.on("finish", async () => {
    try {
      // Skip static files
      if (
        req.path === "/favicon.ico" ||
        req.path.startsWith("/assets/") ||
        req.path.endsWith(".js") ||
        req.path.endsWith(".css") ||
        req.path.endsWith(".png") ||
        req.method === "OPTIONS"
      ) {
        return;
      }

      // Skip endpoint page view sendiri (biar nggak double log)
      if (req.path.startsWith("/api/log/")) {
        return;
      }

      // Skip POST internal/sync yang nggak perlu di-log
      const internalPaths = [
        "/api/admin/dashboard/update-best-seller",
      ];
      if (internalPaths.includes(req.path)) {
        return;
      }

      const responseTime = Date.now() - startTime;
      let action_type = null;

      // Hanya log aksi yang berubah data atau error
      if (res.statusCode === 401) action_type = "UNAUTHORIZED";
      else if (res.statusCode === 403) action_type = "FORBIDDEN";
      else if (res.statusCode >= 500) action_type = "SERVER_ERROR";
      else if (req.path.includes("login")) action_type = "LOGIN";
      else if (req.path.includes("logout")) action_type = "LOGOUT";
      else if (req.method === "POST" && res.statusCode < 400) action_type = "CREATE";
      else if ((req.method === "PUT" || req.method === "PATCH") && res.statusCode < 400) action_type = "UPDATE";
      else if (req.method === "DELETE") action_type = "DELETE";
      else if (res.statusCode >= 400 && res.statusCode < 500) action_type = "CLIENT_ERROR";

      // GET yang sukses & yang nggak punya action_type? SKIP
      if (!action_type) {
        return;
      }

      ServerLog.create({
        ip_address: req.ip || req.connection.remoteAddress || "unknown",
        method: req.method,
        url: req.originalUrl,
        status_code: res.statusCode,
        response_time: responseTime,
        user_agent: req.get("user-agent") || null,
        user_id: req.user?._id || null,
        username: req.user?.username || null,
        action_type,
      }).catch((err) => console.error("Error saving log:", err));
    } catch (error) {
      console.error("Error in logger:", error);
    }
  });

  next();
};

export default requestLogger;