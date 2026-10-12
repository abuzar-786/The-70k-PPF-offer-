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
  const [method, setMethod] = useState<"email" | "whatsapp">("email");
  const [contacts, setContacts] = useState({ email: "", whatsapp: "" });
  const [marketing, setMarketing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const busy = useRef(false),
    started = useRef(false),
    attempt = useRef<{ key: string; id: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const start = () => {
    if (!started.current) {
      started.current = true;
      track("lead_form_started", { method });
    }
  };
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || receipt) return;
    const contact = normalizeContact(method, contacts[method]);
    if (!contact) {
      setError(
        method === "email"
          ? "Enter a valid email address."
          : "Enter a valid 10-digit Indian mobile number, optionally with +91.",
      );
      inputRef.current?.focus();
      return;
    }
    const utm = Object.fromEntries(
      [
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_term",
        "utm_content",
      ].map((key) => [
        key,
        new URLSearchParams(window.location.search).get(key) || "",
      ]),
    );
    const key = JSON.stringify({ method, contact, marketing, utm });
    if (attempt.current?.key !== key)
      attempt.current = { key, id: crypto.randomUUID() };
    busy.current = true;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method,
          contact,
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
        method,
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
            onClick={() => track("guide_download_clicked", { method })}
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
      <fieldset disabled={loading || !ready} className="channel-fieldset">
        <legend>Receive your guide via</legend>
        <div className="segmented-control">
          {(["email", "whatsapp"] as const).map((channel) => (
            <label
              key={channel}
              className={method === channel ? "selected" : ""}
            >
              <input
                type="radio"
                name="method"
                value={channel}
                checked={method === channel}
                onChange={() => {
                  setMethod(channel);
                  setError("");
                }}
              />
              {channel === "email" ? (
                <Mail size={17} />
              ) : (
                <MessageCircle size={17} />
              )}
              <span>{channel === "email" ? "Email" : "WhatsApp"}</span>
              {method === channel && <Check size={14} />}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="input-label" htmlFor="contact">
        {method === "email" ? "Your email address" : "Your WhatsApp number"}
      </label>
      <div className="input-wrap">
        {method === "email" ? <Mail size={18} /> : <MessageCircle size={18} />}
        <input
          ref={inputRef}
          id="contact"
          name="contact"
          type={method === "email" ? "email" : "tel"}
          inputMode={method === "email" ? "email" : "tel"}
          autoComplete={method === "email" ? "email" : "tel"}
          placeholder={
            method === "email" ? "you@yourstudio.com" : "+91 98765 43210"
          }
          value={contacts[method]}
          onFocus={start}
          onChange={(e) => {
            setContacts({ ...contacts, [method]: e.target.value });
            setError("");
          }}
          required
          maxLength={method === "email" ? 254 : 24}
          disabled={loading || !ready}
          aria-invalid={!!error}
          aria-describedby={error ? "form-error" : undefined}
        />
      </div>
      <label className="marketing-consent">
        <input
          type="checkbox"
          checked={marketing}
          disabled={loading || !ready}
          onChange={(e) => setMarketing(e.target.checked)}
        />
        <span>
          Yes, I’d also like occasional studio growth tips and offers via my
          chosen channel. <span className="optional">(Optional)</span>
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
