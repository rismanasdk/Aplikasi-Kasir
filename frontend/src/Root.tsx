import React, { useEffect } from "react";
import App from "./App";
import { API_URL } from "./config/api";
import { getStoredToken, getStoredUser } from "./auth/storage";
const API_KEY = import.meta.env.VITE_API_KEY;

const Root: React.FC = () => {
  useEffect(() => {
    const loadingTitle = "Loading...";
    const fallbackTitle = "Aplikasi Kasir";

    document.title = loadingTitle;

    const fallbackTimer = window.setTimeout(() => {
      if (document.title === loadingTitle) {
        document.title = fallbackTitle;
      }
    }, 800);

    const getStoreSettings = async () => {
      try {
        const token = getStoredToken();
        if (!token) {
          document.title = fallbackTitle;
          return;
        }
        const role = getStoredUser<{ role?: string }>()?.role;
        const isSuperAdmin = role === "super-admin";
        const isManager = role === "manajer" || role === "manager";
        const settingsPath = isSuperAdmin
          ? "/api/super-admin/settings"
          : isManager
            ? "/api/manager/settings"
            : "/api/common/settings";

        const res = await fetch(`${API_URL}${settingsPath}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            ...(API_KEY ? { "x-api-key": API_KEY } : {}),
          },
        });
        if (!res.ok) {
          document.title = fallbackTitle;
          return;
        }
        const data = await res.json();

        document.title = data.storeName || fallbackTitle;
        if (data.storeLogo) {
          const favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement;
          if (favicon) favicon.href = data.storeLogo;
        }
      } catch (error) {
        console.error("Gagal mengambil store name:", error);
        document.title = fallbackTitle;
      }
    };

    getStoreSettings();

    return () => {
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  return <App />;
};

export default Root;
