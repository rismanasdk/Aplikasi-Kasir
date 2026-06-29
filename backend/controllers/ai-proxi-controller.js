// backend/controllers/ai-proxy-controller.js
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

const proxyRequest = async (req, res) => {
  const path = req.originalUrl.replace(/^\/api\/bi/, "/bi");
  const qs = new URL(req.url, "http://localhost").search;
  const fullUrl = `${AI_SERVICE_URL}${path}${qs}`;

  try {
    const options = {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
      },
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      const body = await req.text();
      if (body) options.body = body;
    }

    const response = await fetch(fullUrl, options);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error("\x1b[31m[AI Proxy Error]\x1b[0m", error.message);
    res.status(502).json({
      success: false,
      message: "AI Service tidak tersedia. Pastikan ai-service berjalan di port 8000.",
      error: error.message,
    });
  }
};

export const proxyBI = proxyRequest;