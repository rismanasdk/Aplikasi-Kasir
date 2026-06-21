import ServerLog from "../models/serverLog.js";

export const requestLogger = async (req, res, next) => {
  const startTime = Date.now();
  
  // Capture response finish event
  res.on("finish", async () => {
    try {
      const responseTime = Date.now() - startTime;
      const logData = {
        ip_address: req.ip || req.connection.remoteAddress || "unknown",
        method: req.method,
        url: req.originalUrl,
        status_code: res.statusCode,
        response_time: responseTime,
        user_agent: req.get("user-agent") || null,
        user_id: req.user?._id || null,
        username: req.user?.username || null,
      };

      // Determine action type
      if (res.statusCode === 401) {
        logData.action_type = "UNAUTHORIZED";
      } else if (res.statusCode === 403) {
        logData.action_type = "FORBIDDEN";
      } else if (res.statusCode >= 400 && res.statusCode < 500) {
        logData.action_type = "CLIENT_ERROR";
      } else if (res.statusCode >= 500) {
        logData.action_type = "SERVER_ERROR";
      } else if (req.path.includes("login")) {
        logData.action_type = "LOGIN";
      } else if (req.path.includes("logout")) {
        logData.action_type = "LOGOUT";
      }

      // Save log to database
      await ServerLog.create(logData);
    } catch (error) {
      console.error("Error saving server log:", error);
    }
  });

  next();
};

export default requestLogger;
