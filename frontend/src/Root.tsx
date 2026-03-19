import React, { useEffect } from "react";
import App from "./App";
import { API_URL } from "./config/api";
const API_KEY = import.meta.env.VITE_API_KEY;

const Root: React.FC = () => {
  useEffect(() => {
    const getStoreSettings = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const storedUser = localStorage.getItem("user");
        const role = storedUser ? JSON.parse(storedUser)?.role : undefined;
        const isAdmin = role === "admin";
        const isManager = role === "manajer" || role === "manager";
        const settingsPath = isAdmin
          ? "/api/admin/settings"
          : isManager
            ? "/api/manager/settings"
            : "/api/common/settings";

        const res = await fetch(`${API_URL}${settingsPath}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            ...(API_KEY ? { "x-api-key": API_KEY } : {}),
          },
        });
        if (!res.ok) return;
        const data = await res.json();

        if (data.storeName) document.title = data.storeName;
        if (data.storeLogo) {
          const favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement;
          if (favicon) favicon.href = data.storeLogo;
        }
      } catch (error) {
        console.error("Gagal mengambil store name:", error);
      }
    };

    getStoreSettings();
  }, []);

  return <App />;
};

export default Root;
