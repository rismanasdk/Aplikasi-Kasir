const env = import.meta.env;

const API_PORT = env.VITE_API_PORT || "5000";
const DEFAULT_BACKEND_HOST = env.VITE_BACKEND_HOST || env.VITE_NETWORK_IP || "192.168.0.9";

const normalizeHost = (host?: string) => {
  const cleanHost = (host || "").trim();
  if (!cleanHost || cleanHost === "localhost" || cleanHost === "127.0.0.1" || cleanHost === "0.0.0.0") {
    return DEFAULT_BACKEND_HOST;
  }

  return cleanHost;
};

const normalizeApiUrl = (value?: string) => {
  const rawUrl = (value || "").trim();

  try {
    if (rawUrl) {
      const parsed = new URL(rawUrl);
      parsed.hostname = normalizeHost(parsed.hostname);
      return parsed.toString().replace(/\/$/, "");
    }
  } catch {
    // Abaikan env yang tidak valid dan lanjut ke fallback runtime.
  }

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    const host = normalizeHost(window.location.hostname);
    return `${protocol}//${host}:${API_PORT}`;
  }

  return `http://${DEFAULT_BACKEND_HOST}:${API_PORT}`;
};

// Semua request frontend pakai nilai ini. Saat frontend dibuka dari localhost,
// backend tetap diarahkan ke IP LAN agar perangkat lain bisa mengaksesnya.
export const API_URL = normalizeApiUrl(env.VITE_API_BASE_URL || env.VITE_API_URL || env.VITE_IPBE);

// Debug: log API_URL yang digunakan
// if (typeof window !== "undefined") {
//   console.log(" API_URL:", API_URL);
//   console.log(" Window hostname:", window.location.hostname);
//   console.log(" Full origin:", window.location.origin);
// }
