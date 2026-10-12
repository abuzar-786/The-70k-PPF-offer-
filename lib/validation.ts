export const CAMPAIGN = "70k-ppf-offer-secret";
export const NOTICE_VERSION = "guide-request-v1";
export type LeadInput = {
  method: "email" | "whatsapp";
  contact: string;
  requestId: string;
  marketingConsent: boolean;
  utm: Record<string, string>;
};
export function normalizeContact(method: string, value: string): string | null {
  const contact = value.trim();
  if (method === "email")
    return contact.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)
      ? contact.toLowerCase()
      : null;
  if (method !== "whatsapp" || !/^[+\d\s()-]+$/.test(contact)) return null;
  let digits = contact.replace(/\D/g, "");
  if (digits.startsWith("0091") && digits.length === 14)
    digits = digits.slice(4);
  else if (digits.startsWith("91") && digits.length === 12)
    digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 11)
    digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}
export function validateLead(value: unknown): LeadInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (
    (v.method !== "email" && v.method !== "whatsapp") ||
    typeof v.contact !== "string" ||
    typeof v.marketingConsent !== "boolean" ||
    typeof v.requestId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      v.requestId,
    )
  )
    return null;
  const contact = normalizeContact(v.method, v.contact);
  if (!contact) return null;
  const utm: Record<string, string> = {};
  if (v.utm && typeof v.utm === "object" && !Array.isArray(v.utm)) {
    for (const key of [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
    ]) {
      const val = (v.utm as Record<string, unknown>)[key];
      if (typeof val === "string")
        utm[key] = val.replace(/[\u0000-\u001f]/g, "").slice(0, 200);
    }
  }
  return {
    method: v.method,
    contact,
    requestId: v.requestId,
    marketingConsent: v.marketingConsent,
    utm,
  };
}
