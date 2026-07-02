import { buildAiUrlFromRequest, createAiRequestOptions, fetchWithTimeout, parseAiServiceResponse, AI_SERVICE_TIMEOUT_MS } from "../services/aiService.js";

const proxyRequest = async (req, res) => {
  const targetUrl = buildAiUrlFromRequest(req);

  try {
    const options = createAiRequestOptions({ method: req.method, body: req.body, req });
    
    // Log produk requests for debugging
    if (req.path.includes('/produk')) {
      console.log(`[AI Proxy] ${req.method} ${req.path} → ${targetUrl}`);
      if (req.body) {
        console.log('[AI Proxy] Request body keys:', Object.keys(req.body).join(', '));
        if (req.body.produk) {
          console.log('[AI Proxy] Produk keys:', Object.keys(req.body.produk).join(', '));
          if (req.body.produk.top_selling) {
            console.log(`[AI Proxy] top_selling: ${req.body.produk.top_selling.length} items`);
          }
        }
      }
    }
    
    const response = await fetchWithTimeout(targetUrl, options, AI_SERVICE_TIMEOUT_MS);

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await parseAiServiceResponse(response);
      
      // Log errors for produk requests
      if (req.path.includes('/produk') && response.status >= 400) {
        console.log(`[AI Proxy] Error response (${response.status}):`, JSON.stringify(data).substring(0, 500));
      }
      
      return res.status(response.status).json(data);
    }

    const text = await response.text();
    return res.status(response.status).send(text);
  } catch (error) {
    if (error?.name === "AbortError") {
      console.error(`\x1b[33m[AI Proxy Timeout]\x1b[0m ${targetUrl}`);
      return res.status(504).json({
        success: false,
        message: `AI Service timeout setelah ${AI_SERVICE_TIMEOUT_MS / 1000}s.`,
        error: "Gateway Timeout",
      });
    }

    console.error("\x1b[31m[AI Proxy Error]\x1b[0m", error?.message || error, "→", targetUrl);
    return res.status(502).json({
      success: false,
      message: "AI Service tidak tersedia. Pastikan ai-service berjalan.",
      error: error?.message || String(error),
      target: targetUrl,
    });
  }
};

export const proxyBI = proxyRequest;
