export const AI_SERVICE_URL = (process.env.AI_SERVICE_URL || "http://localhost:8000").replace(/\/+$|\s+$/g, "");
export const AI_SERVICE_TIMEOUT_MS = (() => {
  const configured = Number.parseInt(process.env.AI_SERVICE_TIMEOUT_MS || "90000", 10);
  return Number.isFinite(configured) && configured > 0 ? configured : 90000;
})();

export const buildAiUrl = (path = "", queryParams = {}) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${AI_SERVICE_URL}${normalizedPath}`);

  Object.entries(queryParams).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, String(value));
  });

  return url.toString();
};

export const buildAiUrlFromRequest = (req) => {
  const requestPath = req.originalUrl.replace(/^\/api\/bi/, "/api/v1/bi");
  return `${AI_SERVICE_URL}${requestPath}`;
};

export const createAiRequestOptions = ({ method = "GET", body, req, extraHeaders = {} } = {}) => {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...extraHeaders,
  };

  if (req?.headers?.authorization) {
    headers.Authorization = req.headers.authorization;
  }

  const options = {
    method,
    headers,
  };

  if (body != null && method !== "GET" && method !== "HEAD") {
    options.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  return options;
};

export const fetchWithTimeout = async (url, options = {}, timeoutMs = AI_SERVICE_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

export const parseAiServiceResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  const rawBody = await response.text();

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(rawBody);
    } catch (error) {
      throw new Error(`AI Service returned malformed JSON: ${error.message}`);
    }
  }

  return rawBody;
};
