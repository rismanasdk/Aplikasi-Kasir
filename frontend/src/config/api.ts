const env = import.meta.env;

// Otomatis gunakan IP yang diakses (window.location.hostname)
// Jadi tidak perlu ubah config lagi saat IP laptop berubah
const fallbackApiUrl =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:5000`
    : "http://localhost:5000";

export const API_URL = (env.VITE_API_URL || env.VITE_IPBE || fallbackApiUrl) as string;

// Debug: log API_URL yang digunakan
if (typeof window !== "undefined") {
  console.log("🔗 API_URL:", API_URL);
  console.log("📍 Window hostname:", window.location.hostname);
  console.log("🌐 Full origin:", window.location.origin);
}
