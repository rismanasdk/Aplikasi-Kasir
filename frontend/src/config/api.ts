const env = import.meta.env;

// Semua request frontend pakai nilai ini. Saat frontend dibuka dari localhost,
// backend tetap diarahkan ke IP LAN agar perangkat lain bisa mengaksesnya.
export const API_URL =
  env.VITE_API_URL ??
  "http://localhost:5000";

// Debug: log API_URL yang digunakan
// if (typeof window !== "undefined") {
//   console.log(" API_URL:", API_URL);
//   console.log(" Window hostname:", window.location.hostname);
//   console.log(" Full origin:", window.location.origin);
// }
