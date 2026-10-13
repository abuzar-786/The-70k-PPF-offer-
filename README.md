# The ₹70K+ PPF Offer Secret

The landing page is now **form-free** so Systeme.io's native opt-in form can register contacts and trigger its email campaign automation. The supplied cover, charcoal/porcelain/lime palette, mobile stacking, and container-width responsiveness are preserved.

## Use it in Systeme.io

1. Replace your old Raw HTML block with the **entire contents of `systemeio.html`**. This is the header, offer, and guide-cover panel only.
2. Immediately below that block, add native Systeme.io fields: Email and a WhatsApp contact/custom field. Add the heading **Get Your Free Copy** and supporting text **Enter your email and WhatsApp number to receive the guide.** using native text elements if desired.
3. Add a **native Systeme.io button** with text **Get My Free Guide →** and action **Submit form**. Use `#C7F000` with `#111315` text, a full-width mobile button, and approximately 56px height. Configure field validation in Systeme.io.
4. In the funnel step's automation rules, choose **Funnel step form subscribed → Subscribe to campaign**, then select your actual guide-delivery campaign. Test with your own email and confirm the contact and first email in Systeme.io. The code changes do not configure your account or prove delivery.
5. Upload the genuine updated ₹70K+ guide PDF to your file library and use its actual download link in the campaign email/thank-you page. The cover image is not the PDF; do not substitute an older ₹50K+ guide.
6. Optionally add a second Raw HTML block **below the native form** and paste `systemeio-footer.html`. It contains the reassurance strip and footer. Set its public `agencyName` and genuine `privacyPolicyUrl` in the small CONFIG object. No policy is fabricated.

**Page order:** offer/cover HTML → native Systeme.io opt-in form → optional footer HTML.

Use a full-width section/row with no fixed minimum width or extra padding. Do not append another copy of the old block. Keep the native fields outside the Raw HTML code, so they remain native Systeme.io elements. Suggested form-section background: `#F1F0EC`; input borders: `#B8BEC4`; dark text: `#111315`.

The custom fields, submit button, privacy summary tied to the former custom form, setup notices, lead API calls, and submission handlers have been removed from the landing page. The HTML does not create, validate, intercept, or submit your native form. No webhook/API credentials are required in the HTML. Manage consent, guide fulfilment, any additional promotional campaigns, analytics, and optional WhatsApp messages in your actual Systeme.io/provider configuration. A collected phone number alone does not authorize promotional WhatsApp messages.

## Cover and mobile layout

The genuine owner-supplied cover URL is included directly as an image src in `systemeio.html`; it also renders without JavaScript. Only the cover URL can be changed in that block's public CONFIG. The optional script handles cover fallback and emits a contact-free `ppf:analytics` landing_page_view hook. No external tracker loads from either HTML block.

Mobile layout is one column by default. Named container queries use the HTML block width, so it also fits a phone-width preview inside a desktop editor. The offer and cover remain above the native form; their CSS is scoped and does not style the native inputs/button. The optional footer uses a separate `ppf-footer` ID.

## Local Next.js preview

Use Node 20.9+ in the existing checkout; no Git worktree is needed.

```sh
npm ci --cache /workspace/.npm-cache
npm run dev
```

The Next.js homepage also has no custom opt-in form. It previews the offer, cover, reassurance, and footer; the native Systeme.io form is added in that platform's editor.

```sh
npm run lint
npm run typecheck
npm run build
npx --no-install playwright test
```

Run the browser checks with the app on port 3000. They check normal viewports, phone-width embeds inside a desktop editor, the supplied image URL, form-free markup, independent footer placement, and a representative native form that submits without interception. Image responses are mocked for layout checks because cloud CDN access was previously restricted; this does not validate the live image CDN or your campaign integration.

The former server API and validation helpers remain available for other explicit integrations, but the landing page never calls them. Their historical contract is documented in [legacy custom-capture notes](docs/legacy-custom-capture.md).
