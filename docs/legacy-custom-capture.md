# Legacy custom-capture implementation

The current landing page uses Systeme.io native forms. The notes below describe the former custom form/API workflow, retained as a reference. This workflow is not loaded by systemeio.html.

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

| Variable                         | Purpose                                                                                                              |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `APP_ORIGIN`                     | Exact public origin, e.g. `https://your-domain.example`, for same-origin browser submission checks.                  |
| `LEAD_WEBHOOK_URL`               | HTTPS endpoint owned by your agency that durably stores leads and coordinates delivery.                              |
| `LEAD_WEBHOOK_TOKEN`             | Optional server-side bearer credential for that endpoint; use a production secret manager.                           |
| `NEXT_PUBLIC_PRIVACY_POLICY_URL` | Your real reviewed policy URL. Required for live API acceptance, and shown on the page.                              |
| `NEXT_PUBLIC_GUIDE_COVER_URL`    | Public HTTPS URL of the genuine uploaded cover for the Next.js page; the single-file page uses CONFIG.guideCoverUrl. |
| `GUIDE_PDF_PATH`                 | Server-accessible absolute file path to the actual updated ₹70K+ guide.                                              |
| `GUIDE_VERSION`                  | Set to `70k` only after checking the document title/content. An old ₹50K+ PDF must never be used.                    |
| `NEXT_PUBLIC_GA4_ID`             | Optional actual GA4 measurement ID.                                                                                  |
| `NEXT_PUBLIC_META_PIXEL_ID`      | Optional actual Meta Pixel ID.                                                                                       |
| `LEAD_STORAGE_DIR`               | Local test storage location; `.data/leads` by default. Not a production database.                                    |
| `LEAD_CAPTURE_MODE`              | `development` allows local testing of a production build; omit in production.                                        |

The brand and Privacy Policy are explicit placeholders. Supply your agency identity and genuine policy before launch. No fictitious policy page is supplied. The in-form privacy summary describes guide fulfilment and separate, optional marketing permission; update it and `NOTICE_VERSION` together if data uses change. Establish retention/deletion procedures and actual processor disclosures in the real policy.

## Integration contract

`POST /api/leads` requires and validates both an email address and an Indian WhatsApp number, checks browser Origin, rejects oversized JSON, and creates a server timestamp and campaign identifier. It sends JSON to your configured HTTPS webhook with `Authorization: Bearer <token>` (when set) and `Idempotency-Key: <requestId>`:

```json
{
  "method": "email",
  "contact": "owner@studio.com",
  "email": "owner@studio.com",
  "whatsapp": "+919876543210",
  "captureMethod": "email_and_whatsapp",
  "deliveryChannel": "email",
  "requestId": "11111111-1111-4111-8111-111111111111",
  "marketingConsent": false,
  "utm": { "utm_source": "instagram", "utm_campaign": "premium-ppf" },
  "submittedAt": "2026-10-11T00:00:00.000Z",
  "sourceCampaign": "70k-ppf-offer-secret",
  "consent": {
    "guideRequested": true,
    "marketing": false,
    "noticeVersion": "guide-request-email-and-whatsapp-v2",
    "recordedAt": "2026-10-11T00:00:00.000Z",
    "channel": "email",
    "whatsappGuideRequested": false,
    "marketingChannels": []
  }
}
```

Persist the payload in your real database/CRM with a UNIQUE constraint on requestId before acknowledging. Repeated identical requests must return the same receipt; reject attempts to reuse a key with different data. Keep capture and a delivery outbox in one transaction. Apply a contact/campaign cooldown to prevent different request IDs from producing duplicate messages. Do not rely on client-side protection or process memory for distributed idempotency.

Return JSON `{"stored":true,"delivery":"queued"}` only after durable capture and durable queueing. Supported delivery values: `sent` (confirmed by provider), `queued` (durable delivery job), `unavailable` (capture succeeded, but delivery not configured). Do not claim `sent` merely because a webhook fired. Failure, timeouts, or invalid receipts yield a retryable error; the client reuses the same ID for the same payload. Production persistence and delivery cannot be validated until your endpoint is configured.

The combined form delivers the requested guide by email. Collecting a WhatsApp number does not authorize WhatsApp messages. WhatsApp messages and promotional follow-up require the separate marketing opt-in; persist the explicit marketingChannels list and enforce it in delivery workers. For email, use your provider with a verified sender/domain. For WhatsApp, use an approved WhatsApp Business provider and applicable templates/consent rules; send only the requested resource, never unsolicited promotional messages. Optional promotions require the separate marketing opt-in. Store consent audit details and provide unsubscribe/withdrawal handling. Credentials belong in the integration server's secret manager, not browser code. Configure the matching ₹70K+ asset in that integration as well.

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

Tests cover target viewport widths, overflow, combined email/WhatsApp fields, validation, marketing default, local storage receipts, duplicate API requests, missing PDF behavior, and the safe JavaScript-disabled state. The form stays disabled until hydration and uses POST as a fallback so contact details never enter URL query strings. Browser tests are intended for development mode and use synthetic test contacts. Tests create local test records; delete them when no longer needed.

## Single-file Systeme.io version

`systemeio.html` is the complete framework-free version: markup, scoped CSS, inline SVG icons, and JavaScript in one file. No npm/build step is needed to embed it.

1. Create a blank Systeme.io funnel page. Use a full-width section/row with zero padding and no extra navigation.
2. Add one **Raw HTML / custom HTML** element and paste the entire contents of `systemeio.html`. Save and check the published page; the editor may not execute scripts.
3. Edit the `CONFIG` object near the bottom. `agencyName`, `privacyPolicyUrl`, and `guideCoverUrl` are public. Set `guideCoverUrl` to the stable public HTTPS URL of the genuine uploaded cover in your Systeme.io image library; use the image URL, not a PDF URL. The cover displays uncropped at its original aspect ratio, up to 280px wide on mobile and 220–240px in wider layouts. The owner-supplied Systeme.io CDN cover URL is now the default in both versions. The single-file image has a real src attribute and renders without JavaScript. Its proportions are reserved to prevent layout shifts; no substitute image or altered artwork is used. `leadEndpoint` is a **public HTTPS lead submission API**, not a secret CRM webhook or Systeme.io API URL. Never paste any API key/token here. Optional real GA4/Meta IDs load only after the measurement checkbox is checked. Review page-level Systeme.io tracking settings too: this block cannot prevent trackers configured elsewhere from loading.
4. Set the page SEO title to **The ₹70K+ PPF Offer Secret | Free Guide for PPF Studio Owners** and description to **Selling ₹70K+ PPF packages but attracting price shoppers? Download this free 5-minute offer guide for premium PPF and detailing studios.** Configure the matching Open Graph title/description in your page settings; the custom block cannot reliably replace host metadata.
5. Publish the page after testing on your actual domain. No PDF, policy, tracking IDs, or integration credentials are invented.

### Capturing leads on Systeme.io

A custom HTML form does **not** automatically become a native Systeme.io contact form. For native contacts and funnel automation without an external server, use a built-in Systeme.io opt-in form in the form area and configure its action/automation and the real guide asset in Systeme.io. Native email form behavior does not automatically provide this combined email/WhatsApp fields; adapting native form fields and workflows needs your account configuration. Do not send WhatsApp messages without the requested-channel consent and a compliant provider.

To retain the exact custom form, set `leadEndpoint` to an API you control. The endpoint must accept the same payload documented above; validate it independently; create authoritative server timestamps/campaign/consent records; apply rate limiting; persist idempotently using requestId; and integrate with your CRM/Systeme.io and email delivery provider **server-side**. Keep all credentials in that server's environment/secret manager. The one-file page cannot provide server-side storage or validation on its own.

The API must support browser CORS for your **exact** published Systeme.io page origin, including OPTIONS preflight, POST, and the Content-Type header. Do not use a wildcard as a replacement for origin validation. The existing Next.js route is same-origin only; it needs explicitly configured CORS support before use from a Systeme.io page. Never put `LEAD_WEBHOOK_URL` or `LEAD_WEBHOOK_TOKEN` from the server configuration into this file. A public lead API is intentionally callable without a browser secret and must enforce abuse protection server-side.

Return `{"stored":true,"delivery":"queued","downloadUrl":"https://your-domain.example/the-70k-ppf-offer-secret.pdf"}` only after durable capture and durable delivery queueing. The page also understands the existing API's `status: captured/development` receipt. `delivery` must be `sent`, `queued`, or `unavailable`; only claim sent after provider confirmation. Omit downloadUrl until the genuine updated ₹70K+ guide exists. The browser accepts HTTPS downloads only. A missing endpoint/policy, failed request, or unconfirmed receipt displays an error without claiming success. Retries of the same form data reuse the request ID.

Both versions now use charcoal `#111315`, porcelain `#F1F0EC`, metallic grey `#B8BEC4`, muted `#737B82`, and signal lime `#C7F000`. Lime uses dark text on the CTA. The combined form now appears below the offer and guide-cover panel at every width, with 16px inputs to prevent iOS focus zoom, 56–58px primary controls, and no horizontal overflow. Supporting text uses dark text on porcelain and metallic grey on charcoal to preserve contrast.

The source deliberately contains no secret values, database, or real PDF. A publicly reachable integration, actual policy, brand, and matching guide are still required before accepting real leads.

### Systeme.io mobile/editor layout

The block uses a single-column layout by default: offer, guide-cover panel, then opt-in form. Named CSS container queries enable wider layouts based on the width of `#ppf-landing`, rather than the outer browser window. This covers Systeme.io's narrow mobile-preview block inside a desktop editor. Container-relative heading sizes prevent desktop typography from being squeezed into a phone-sized panel. If a browser does not support container queries, the safe single-column layout remains.

Regression tests cover 320, 360, 390, and 768px embeds inside a 1440px browser window, as well as normal mobile/tablet/desktop viewports. They assert the panel order, usable input/form widths, and containment of headings and controls.

Replace the previous Raw HTML block entirely with this version rather than appending a second copy. Set the surrounding Systeme.io section/row to full width with no fixed minimum width or extra padding. Preserve your existing public CONFIG values when replacing the block. The genuine cover is connected using the public URL supplied by the owner. The cloud egress proxy blocked direct image verification (CONNECT 403); its specific CDN hostname has been saved as a network-draft addition for review. That cloud policy does not change the hosted Systeme.io page, which loads the supplied URL directly.
