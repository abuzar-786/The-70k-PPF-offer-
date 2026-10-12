import Link from "next/link";
import {
  Check,
  ArrowUpRight,
  BookOpen,
  Clock3,
  ShieldCheck,
} from "lucide-react";
import GuideCover from "@/components/guide-cover";
import LeadForm from "@/components/lead-form";
import AnalyticsConsent from "@/components/analytics-consent";
export const dynamic = "force-dynamic";
const benefits = [
  "Why generic PPF offers invite price comparisons.",
  "The CAR + PROBLEM + PREMIUM OUTCOME formula.",
  "A 5-minute exercise to rewrite your existing offer.",
];
export default function Home() {
  const privacy = process.env.NEXT_PUBLIC_PRIVACY_POLICY_URL;
  const development =
    !process.env.LEAD_WEBHOOK_URL &&
    (process.env.NODE_ENV !== "production" ||
      process.env.LEAD_CAPTURE_MODE === "development");
  return (
    <>
      <header className="header">
        <div className="container header-inner">
          <Link
            className="brand"
            href="/"
            aria-label="PPF Growth Resources home"
          >
            <span className="brand-symbol" aria-hidden="true">
              <ArrowUpRight size={18} />
            </span>
            PPF Growth Resources
          </Link>
          <span className="header-label">FREE GUIDE</span>
        </div>
      </header>
      <main id="main">
        <section className="hero" aria-labelledby="hero-title">
          <div className="container hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">
                <span />
                FOR PREMIUM PPF &amp; DETAILING STUDIO OWNERS
              </p>
              <h1 id="hero-title">
                Selling ₹70K+ PPF Packages But Still Attracting{" "}
                <span>Price Shoppers?</span>
              </h1>
              <p className="hero-description">
                Discover a simple 3-part offer formula to position your existing
                PPF packages for serious luxury-car buyers — instead of making
                price the first conversation.
              </p>
            </div>
            <div className="guide-card">
              <GuideCover src={process.env.NEXT_PUBLIC_GUIDE_COVER_URL || ""} />
              <div className="guide-details">
                <span className="card-kicker">
                  <BookOpen size={14} /> THE FREE GUIDE
                </span>
                <h2>The ₹70K+ PPF Offer Secret</h2>
                <p className="guide-subtitle">
                  Free 5-minute guide for premium studios
                </p>
                <ul>
                  {benefits.map((benefit) => (
                    <li key={benefit}>
                      <span className="check-icon">
                        <Check size={14} strokeWidth={3} />
                      </span>
                      {benefit}
                    </li>
                  ))}
                </ul>
                <p className="reading-note">
                  <Clock3 size={14} /> A focused read. A clearer offer.
                </p>
              </div>
            </div>
            <div className="form-shell">
              <div className="form-topline">
                <span className="small-pill">FREE RESOURCE</span>
                <span className="form-step">01 / OFFER CLARITY</span>
              </div>
              <h2>Get Your Free Copy</h2>
              <p className="form-description">
                Enter your email and WhatsApp number to receive the guide.
              </p>
              <LeadForm development={development} />
              <div className="form-divider" />
              <div className="privacy-note">
                <ShieldCheck size={18} />
                <p>
                  We use your email to deliver the guide and store your WhatsApp
                  number with your request. WhatsApp messages and promotional
                  follow-up are only sent if you opt in above.
                </p>
              </div>
              {privacy ? (
                <a className="privacy-link" href={privacy}>
                  Read our Privacy Policy <ArrowUpRight size={12} />
                </a>
              ) : (
                <span className="privacy-placeholder">
                  Privacy Policy — content pending
                </span>
              )}
            </div>
          </div>
        </section>
        <section className="reassurance">
          <div className="container">
            <span className="reassurance-line" />
            <h2>
              Your PPF package is premium. Your offer should communicate why.
            </h2>
            <p>Built for established PPF and detailing studios.</p>
          </div>
        </section>
      </main>
      <footer className="footer container">
        <div className="footer-brand">[Your agency name]</div>
        <div className="footer-links">
          {privacy ? (
            <a href={privacy}>Privacy Policy</a>
          ) : (
            <span>Privacy Policy (coming soon)</span>
          )}
          <span>© {new Date().getFullYear()} PPF Growth Resources</span>
        </div>
        <AnalyticsConsent />
      </footer>
    </>
  );
}
