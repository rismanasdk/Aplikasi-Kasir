// backend/controllers/ai-proxy-controller.js
/**
 * Proxy controller: meneruskan semua request /api/bi/* ke AI Service (FastAPI).
 * Menambahkan error handling, timeout, dan logging yang lebih baik.
 */

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
const PROXY_TIMEOUT_MS = parseInt(process.env.AI_SERVICE_TIMEOUT_MS || "15000", 10);

/**
 * Bangun URL tujuan dari request Express.
 * /api/bi/ringkasan?start=2024-01-01  →  http://localhost:8000/bi/ringkasan?start=2024-01-01
 */
function buildTargetUrl(req) {
  // Hapus prefix /api/bi, ganti dengan /bi
  const path = req.originalUrl.replace(/^\/api\/bi/, "/bi");
  return `${AI_SERVICE_URL}${path}`;
}

const proxyRequest = async (req, res) => {
  const targetUrl = buildTargetUrl(req);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

    const headers = {
      "Content-Type": "application/json",
      "X-Forwarded-For": req.ip || "",
      ...(req.headers.authorization
        ? { Authorization: req.headers.authorization }
        : {}),
    };

    const fetchOptions = {
      method: req.method,
      headers,
      signal: controller.signal,
    };

    // Sertakan body untuk non-GET/HEAD
    if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    clearTimeout(timeoutId);

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      return res.status(response.status).json(data);
    }

    // Fallback: text
    const text = await response.text();
    return res.status(response.status).send(text);

  } catch (error) {
    if (error.name === "AbortError") {
      console.error(`\x1b[33m[AI Proxy Timeout]\x1b[0m ${targetUrl}`);
      return res.status(504).json({
        success: false,
        message: `AI Service timeout setelah ${PROXY_TIMEOUT_MS / 1000}s.`,
        error: "Gateway Timeout",
      });
    }

    console.error("\x1b[31m[AI Proxy Error]\x1b[0m", error.message, "→", targetUrl);
    return res.status(502).json({
      success: false,
      message: "AI Service tidak tersedia. Pastikan ai-service berjalan.",
      error: error.message,
      target: targetUrl,
    });
  }
};

export const proxyBI = proxyRequest;
