"use client";
type EventName =
  | "landing_page_view"
  | "lead_form_started"
  | "lead_form_submitted"
  | "guide_download_clicked";
type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  fbq?: ((...args: unknown[]) => void) & {
    queue?: unknown[][];
    loaded?: boolean;
    version?: string;
    callMethod?: (...args: unknown[]) => void;
  };
  _fbq?: (...args: unknown[]) => void;
};
let allowed = false;
export function track(
  name: EventName,
  data: Record<string, string | boolean> = {},
) {
  // Only fixed non-contact properties are accepted. Never include contacts or UTM values.
  const safe = Object.fromEntries(
    Object.entries(data).filter(([key]) =>
      ["method", "mode", "delivery"].includes(key),
    ),
  );
  window.dispatchEvent(
    new CustomEvent("ppf:analytics", { detail: { event: name, ...safe } }),
  );
  if (!allowed) return;
  const w = window as AnalyticsWindow;
  w.gtag?.("event", name, safe);
  w.fbq?.("trackCustom", name, safe);
}
export function enableAnalytics() {
  if (allowed) return;
  allowed = true;
  const w = window as AnalyticsWindow;
  const ga = process.env.NEXT_PUBLIC_GA4_ID;
  const meta = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (ga && /^G-[A-Z0-9]+$/.test(ga)) {
    w.dataLayer = w.dataLayer || [];
    // gtag requires its arguments object, rather than a raw array.
    // Google's command queue uses the arguments object.
    w.gtag = function () {
      // eslint-disable-next-line prefer-rest-params
      w.dataLayer!.push(arguments);
    };
    w.gtag("js", new Date());
    w.gtag("consent", "default", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    w.gtag("config", ga, { send_page_view: false });
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga)}`;
    document.head.appendChild(script);
  }
  if (meta && /^\d+$/.test(meta)) {
    const fbq: NonNullable<AnalyticsWindow["fbq"]> = (...args: unknown[]) => {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue!.push(args);
    };
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = "2.0";
    w.fbq = fbq;
    w._fbq = fbq;
    fbq("consent", "grant");
    fbq("init", meta);
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }
  track("landing_page_view");
}
export function disableAnalytics() {
  const w = window as AnalyticsWindow;
  w.gtag?.("consent", "update", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  w.fbq?.("consent", "revoke");
  allowed = false;
}
