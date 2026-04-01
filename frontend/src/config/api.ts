const env = import.meta.env;

const fallbackApiUrl =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:5000`
    : "http://localhost:5000";

export const API_URL = (env.VITE_API_URL || env.VITE_IPBE || fallbackApiUrl) as string;
