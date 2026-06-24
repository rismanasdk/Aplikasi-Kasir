import { getStoredToken } from "../auth/storage";
import { API_URL } from "../config/api";

export const logPageView = (pageName: string, pageUrl: string) => {
  const token = getStoredToken();
  if (!token) return; // Jangan log kalau belum login

  // Fire and forget — nggak perlu nunggu response
  fetch(`${API_URL}/api/log/page-view`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      page_name: pageName,
      page_url: pageUrl,
    }),
  }).catch(() => {
    // Silent fail — jangan ganggu user kalau log gagal
  });
};