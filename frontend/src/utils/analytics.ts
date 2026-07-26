declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

const ensureGtag = () => {
  if (typeof window === "undefined") return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || ((...args: unknown[]) => {
    window.dataLayer?.push(args);
  });
};

export const isAnalyticsEnabled = () => Boolean(GA_MEASUREMENT_ID);

export const initGA = () => {
  if (!GA_MEASUREMENT_ID || typeof window === "undefined") return;

  ensureGtag();

  if (document.getElementById("ga4-script")) {
    window.gtag?.("config", GA_MEASUREMENT_ID, {
      send_page_view: false,
      transport_type: "beacon",
    });
    return;
  }

  const script = document.createElement("script");
  script.id = "ga4-script";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  script.onload = () => {
    ensureGtag();
    window.gtag?.("js", new Date());
    window.gtag?.("config", GA_MEASUREMENT_ID, {
      send_page_view: false,
      transport_type: "beacon",
    });
    trackPageView(window.location.pathname);
  };
  script.onerror = () => {
    console.warn("GA4 script failed to load");
  };
  document.head.appendChild(script);
};

export const trackPageView = (path: string) => {
  if (!isAnalyticsEnabled() || typeof window === "undefined") return;

  const safePath = path || window.location.pathname;

  window.gtag?.("event", "page_view", {
    page_title: document.title || "Aplikasi Kasir",
    page_location: window.location.href,
    page_path: safePath,
  });
};

export const trackEvent = (action: string, params?: Record<string, unknown>) => {
  if (!isAnalyticsEnabled() || typeof window === "undefined") return;

  window.gtag?.("event", action, params);
};
