"use client";
import { useRef, useState, useSyncExternalStore } from "react";
import {
  ArrowRight,
  Mail,
  MessageCircle,
  LockKeyhole,
  LoaderCircle,
  Check,
  Download,
} from "lucide-react";
import { normalizeContact } from "@/lib/validation";
import { track } from "@/lib/analytics";
type Receipt = {
  status: "development" | "captured";
  message: string;
  delivery: string;
  downloadUrl: string | null;
};
const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
export default function LeadForm({ development }: { development: boolean }) {
  const ready = useSyncExternalStore(subscribe, clientReady, serverReady);
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [marketing, setMarketing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [invalid, setInvalid] = useState<"email" | "whatsapp" | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const busy = useRef(false),
    started = useRef(false),
    attempt = useRef<{ key: string; id: string } | null>(null);
  const emailRef = useRef<HTMLInputElement>(null),
    whatsappRef = useRef<HTMLInputElement>(null);
  function start() {
    if (!started.current) {
      started.current = true;
      track("lead_form_started", { method: "email" });
    }
  }
  function clearError() {
    setError("");
    setInvalid(null);
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || receipt) return;
    const normalizedEmail = normalizeContact("email", email);
    const normalizedWhatsapp = normalizeContact("whatsapp", whatsapp);
    if (!normalizedEmail) {
      setError("Enter a valid email address.");
      setInvalid("email");
      emailRef.current?.focus();
      return;
    }
    if (!normalizedWhatsapp) {
      setError(
        "Enter a valid 10-digit Indian WhatsApp number, optionally with +91.",
      );
      setInvalid("whatsapp");
      whatsappRef.current?.focus();
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const utm = Object.fromEntries(
      [
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_term",
        "utm_content",
      ].map((key) => [key, params.get(key) || ""]),
    );
    const key = JSON.stringify({
      email: normalizedEmail,
      whatsapp: normalizedWhatsapp,
      marketing,
      utm,
    });
    if (attempt.current?.key !== key)
      attempt.current = { key, id: crypto.randomUUID() };
    busy.current = true;
    setLoading(true);
    clearError();
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "email",
          email: normalizedEmail,
          whatsapp: normalizedWhatsapp,
          contact: normalizedEmail,
          marketingConsent: marketing,
          requestId: attempt.current.id,
          utm,
        }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error ||
            "Your request could not be confirmed. Please try again.",
        );
      setReceipt(result);
      track("lead_form_submitted", {
        method: "email",
        mode: result.status,
        delivery: result.delivery,
      });
    } catch (err) {
      setError(
        err instanceof Error && err.name !== "TimeoutError"
          ? err.message
          : "The request timed out. Please retry.",
      );
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }
  if (receipt)
    return (
      <div className="success-panel" role="status" aria-live="polite">
        <span className="success-icon">
          <Check size={24} />
        </span>
        <h3>
          {receipt.status === "development"
            ? "Test request saved"
            : "Thank you for your request"}
        </h3>
        <p>{receipt.message}</p>
        {receipt.downloadUrl ? (
          <a
            className="primary-button download-button"
            href={receipt.downloadUrl}
            onClick={() => track("guide_download_clicked", { method: "email" })}
          >
            <Download size={18} /> Download Your Free Guide
          </a>
        ) : (
          <p className="asset-note">
            The updated ₹70K+ guide PDF has not been added yet. No download is
            available.
          </p>
        )}
      </div>
    );
  return (
    <form
      method="post"
      action="/api/leads"
      onSubmit={submit}
      aria-label="Request your free PPF guide"
    >
      <noscript>
        <p className="development-note">
          Enable JavaScript to request your guide. Your contact details will not
          be submitted without it.
        </p>
      </noscript>
      <div className="form-fields">
        <div className="field">
          <label className="input-label" htmlFor="email">
            Your email address
          </label>
          <div className="input-wrap">
            <Mail size={18} />
            <input
              ref={emailRef}
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@yourstudio.com"
              value={email}
              onFocus={start}
              onChange={(e) => {
                setEmail(e.target.value);
                clearError();
              }}
              required
              maxLength={254}
              disabled={loading || !ready}
              aria-invalid={invalid === "email"}
              aria-describedby={invalid === "email" ? "form-error" : undefined}
            />
          </div>
        </div>
        <div className="field">
          <label className="input-label" htmlFor="whatsapp">
            Your WhatsApp number
          </label>
          <div className="input-wrap">
            <MessageCircle size={18} />
            <input
              ref={whatsappRef}
              id="whatsapp"
              name="whatsapp"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+91 98765 43210"
              value={whatsapp}
              onFocus={start}
              onChange={(e) => {
                setWhatsapp(e.target.value);
                clearError();
              }}
              required
              maxLength={24}
              disabled={loading || !ready}
              aria-invalid={invalid === "whatsapp"}
              aria-describedby={
                invalid === "whatsapp" ? "form-error" : undefined
              }
            />
          </div>
        </div>
      </div>
      <label className="marketing-consent">
        <input
          type="checkbox"
          checked={marketing}
          disabled={loading || !ready}
          onChange={(e) => setMarketing(e.target.checked)}
        />
        <span>
          Yes, I’d also like occasional studio growth tips and offers by email
          and WhatsApp. <span className="optional">(Optional)</span>
        </span>
      </label>
      {error && (
        <p className="form-error" id="form-error" role="alert">
          {error}
        </p>
      )}
      <button
        className="primary-button"
        type="submit"
        disabled={loading || !ready}
      >
        {loading ? (
          <>
            <LoaderCircle className="spinner" size={19} />
            Saving your request…
          </>
        ) : (
          <>
            Get My Free Guide <ArrowRight size={19} aria-hidden="true" />
          </>
        )}
      </button>
      <p className="microcopy">
        <LockKeyhole size={12} /> Free download. No payment required.
      </p>
      {development && (
        <p className="development-note">
          Development preview · test requests are saved locally. Guide delivery
          is not connected.
        </p>
      )}
    </form>
  );
}
