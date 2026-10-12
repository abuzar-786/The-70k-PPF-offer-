# The ₹70K+ PPF Offer Secret

A responsive Next.js / React / TypeScript / Tailwind landing page for established PPF studio owners. No stock images, invented testimonials, external fonts, or trackers loaded by default.

## Local development

Use Node 20.9+ (validated with Node 24). From the existing repository checkout:

```sh
npm ci --cache /workspace/.npm-cache
npm run dev
```

The server listens on port 3000. Use the existing isolated checkout; a Git worktree is unnecessary. `npm run dev` saves test requests in ignored `.data/leads/*.json` and explicitly states that no message was sent. The guide is unavailable until the matching PDF is configured. No CRM credentials or PDF were provided.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

Production without integrations returns 503 when submitting; it does not pretend to capture or deliver leads. To inspect the production build in a **local development preview only**, run `LEAD_CAPTURE_MODE=development npm start`. Never enable this override in a public deployment. Live processes need restarting after a cloud snapshot restores.

## Production configuration

Copy `.env.example` to ignored `.env.local`, enter real configuration securely, and restart/rebuild as appropriate. Never commit secrets. Variables beginning with `NEXT_PUBLIC_` are public and fixed at build time; all integration credentials remain server-only.

| Variable                         | Purpose                                                                                             |
| -------------------------------- | --------------------------------------------------------------------------------------------------- |
| `APP_ORIGIN`                     | Exact public origin, e.g. `https://your-domain.example`, for same-origin browser submission checks. |
| `LEAD_WEBHOOK_URL`               | HTTPS endpoint owned by your agency that durably stores leads and coordinates delivery.             |
| `LEAD_WEBHOOK_TOKEN`             | Optional server-side bearer credential for that endpoint; use a production secret manager.          |
| `NEXT_PUBLIC_PRIVACY_POLICY_URL` | Your real reviewed policy URL. Required for live API acceptance, and shown on the page.             |
| `GUIDE_PDF_PATH`                 | Server-accessible absolute file path to the actual updated ₹70K+ guide.                             |
| `GUIDE_VERSION`                  | Set to `70k` only after checking the document title/content. An old ₹50K+ PDF must never be used.   |
| `NEXT_PUBLIC_GA4_ID`             | Optional actual GA4 measurement ID.                                                                 |
| `NEXT_PUBLIC_META_PIXEL_ID`      | Optional actual Meta Pixel ID.                                                                      |
| `LEAD_STORAGE_DIR`               | Local test storage location; `.data/leads` by default. Not a production database.                   |
| `LEAD_CAPTURE_MODE`              | `development` allows local testing of a production build; omit in production.                       |

The brand and Privacy Policy are explicit placeholders. Supply your agency identity and genuine policy before launch. No fictitious policy page is supplied. The in-form privacy summary describes guide fulfilment and separate, optional marketing permission; update it and `NOTICE_VERSION` together if data uses change. Establish retention/deletion procedures and actual processor disclosures in the real policy.

## Integration contract

`POST /api/leads` validates email or Indian mobile numbers, checks browser Origin, rejects oversized JSON, and creates a server timestamp and campaign identifier. It sends JSON to your configured HTTPS webhook with `Authorization: Bearer <token>` (when set) and `Idempotency-Key: <requestId>`:

```json
{
  "method": "email",
  "contact": "owner@studio.com",
  "requestId": "11111111-1111-4111-8111-111111111111",
  "marketingConsent": false,
  "utm": { "utm_source": "instagram", "utm_campaign": "premium-ppf" },
  "submittedAt": "2026-10-11T00:00:00.000Z",
  "sourceCampaign": "70k-ppf-offer-secret",
  "consent": {
    "guideRequested": true,
    "marketing": false,
    "noticeVersion": "guide-request-v1",
    "recordedAt": "2026-10-11T00:00:00.000Z",
    "channel": "email"
  }
}
```

Persist the payload in your real database/CRM with a UNIQUE constraint on requestId before acknowledging. Repeated identical requests must return the same receipt; reject attempts to reuse a key with different data. Keep capture and a delivery outbox in one transaction. Apply a contact/campaign cooldown to prevent different request IDs from producing duplicate messages. Do not rely on client-side protection or process memory for distributed idempotency.

Return JSON `{"stored":true,"delivery":"queued"}` only after durable capture and durable queueing. Supported delivery values: `sent` (confirmed by provider), `queued` (durable delivery job), `unavailable` (capture succeeded, but delivery not configured). Do not claim `sent` merely because a webhook fired. Failure, timeouts, or invalid receipts yield a retryable error; the client reuses the same ID for the same payload. Production persistence and delivery cannot be validated until your endpoint is configured.

Deliver using the requested method only. For email, use your provider with a verified sender/domain. For WhatsApp, use an approved WhatsApp Business provider and applicable templates/consent rules; send only the requested resource, never unsolicited promotional messages. Optional promotions require the separate marketing opt-in. Store consent audit details and provide unsubscribe/withdrawal handling. Credentials belong in the integration server's secret manager, not browser code. Configure the matching ₹70K+ asset in that integration as well.

Before public launch, place the route behind platform/WAF rate limiting and request-body limits (8 KB), configure bot protection appropriate to your traffic, and implement durable idempotency and retention in the integration. Origin validation is not authentication or abuse prevention. Development JSON files are unsuitable for multi-instance/serverless hosting.

## PDF and download

No PDF is fabricated or linked by default. When `GUIDE_PDF_PATH` and `GUIDE_VERSION=70k` are present and the file has a PDF signature, successful requests show an immediate `/api/guide` download. Manual content verification is still required. Keep the configured asset available on every deployment instance. That endpoint serves the free resource publicly; do not use it for private documents.

## Analytics and consent

`window` emits `ppf:analytics` custom events: `landing_page_view`, `lead_form_started`, `lead_form_submitted`, and `guide_download_clicked`. Only method/mode/delivery metadata is included. Contact details and UTM values are never passed to tracking. Development submissions include `mode: development`; do not treat them as live conversions.

The footer contains an unchecked optional analytics/advertising-measurement consent control, separate from marketing follow-up. No external tracker loads until it is checked. GA4 and Meta adapters initialize only when real IDs are supplied. Unchecking revokes consent for future events. Consent is session-only and defaults off on reload. Review actual vendor configuration, cookie retention, and your policy before enabling these integrations. Configure conversions in each analytics platform around the named events, excluding development mode. Trackers are not proof of delivery.

## Browser smoke checks

System Chromium is available in this cloud environment. With the app running on port 3000:

```sh
npx playwright test
```

Tests cover target viewport widths, overflow, capture-channel switching, validation, marketing default, local storage receipts, duplicate API requests, missing PDF behavior, and the safe JavaScript-disabled state. The form stays disabled until hydration and uses POST as a fallback so contact details never enter URL query strings. Browser tests are intended for development mode and use synthetic test contacts. Tests create local test records; delete them when no longer needed.
