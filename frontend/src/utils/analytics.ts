declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

export const isAnalyticsEnabled = () => Boolean(GA_MEASUREMENT_ID);

export const initGA = () => {
  if (!GA_MEASUREMENT_ID || typeof window === "undefined") return;

  if (document.getElementById("ga4-script")) return;

  const script = document.createElement("script");
  script.id = "ga4-script";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer?.push(arguments);
  };

  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, {
    send_page_view: false,
  });
};

export const trackPageView = (path: string) => {
  if (!isAnalyticsEnabled()) return;

  window.gtag?.("event", "page_view", {
    page_title: document.title || "Aplikasi Kasir",
    page_location: window.location.origin + path,
    page_path: path,
  });
};

export const trackEvent = (action: string, params?: Record<string, unknown>) => {
  if (!isAnalyticsEnabled()) return;

  window.gtag?.("event", action, params);
};
