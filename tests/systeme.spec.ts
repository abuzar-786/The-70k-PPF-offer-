import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const source = readFileSync("systemeio.html", "utf8");
const publicEndpoint = "https://api.ppf-test.example/leads";
const configured = source
  .replace(/leadEndpoint:\s*(["'])\1/, `leadEndpoint: "${publicEndpoint}"`)
  .replace(
    /privacyPolicyUrl:\s*(["'])\1/,
    'privacyPolicyUrl: "https://policy.ppf-test.example/privacy"',
  );
async function serve(page: import("@playwright/test").Page, html = source) {
  await page.route("**/standalone-test", (route) =>
    route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">${html}</body></html>`,
    }),
  );
  await page.goto("/standalone-test");
}
// The cloud egress proxy blocks the supplied CDN. Use a representative image for layout tests; real CDN fetching remains a separate check.
const suppliedCoverUrl =
  "https://d1yei2z3i6k35z.cloudfront.net/1498607/6acce6c85f5cf7.16078938_PPFofferchecklistcoverph.png";
test.beforeEach(async ({ page }) => {
  await page.route(suppliedCoverUrl, (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1055" height="1491"><rect width="1055" height="1491" fill="#111315"/></svg>',
    }),
  );
});

for (const width of [360, 390, 768, 1024, 1440]) {
  test(`Systeme single-file layout ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await serve(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Selling ₹70K+ PPF Packages But Still Attracting Price Shoppers?",
    );
    await expect(
      page.getByRole("button", { name: "Get My Free Guide" }),
    ).toBeEnabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/systeme-${width}.png`,
      fullPage: true,
    });
  });
}
test("Systeme validates both contact fields and never invents capture without integration", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await serve(page);
  await expect(
    page.getByRole("checkbox", { name: /occasional studio/ }),
  ).not.toBeChecked();
  await expect(page.getByRole("radio")).toHaveCount(0);
  await page.getByLabel("Your email address").fill("owner@studio.example");
  await page.getByLabel("Your WhatsApp number").fill("9876543210");
  await page.getByLabel("Your WhatsApp number").fill("1234");
  await page.getByRole("button", { name: "Get My Free Guide" }).click();
  await expect(page.locator("#ppf-form-error")).toContainText(
    "valid 10-digit Indian",
  );
  await page.getByLabel("Your WhatsApp number").fill("+91 98765 43210");
  await page.getByRole("button", { name: "Get My Free Guide" }).click();
  await expect(page.locator("#ppf-form-error")).toContainText(
    "No contact details have been saved",
  );
  await expect(page.getByRole("status")).toHaveCount(0);

  await expect(page.getByLabel("Your email address")).toBeVisible();
  expect(errors).toEqual([]);
});
test("Systeme configured public API handles loading, receipt, attribution, and PDF download hooks", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as unknown as { events: unknown[] }).events = [];
    window.addEventListener("ppf:analytics", (e) =>
      (window as unknown as { events: unknown[] }).events.push(
        (e as CustomEvent).detail,
      ),
    );
  });
  let release!: () => void;
  const pending = new Promise<void>((r) => {
    release = r;
  });
  let count = 0;
  let payload: Record<string, unknown> = {};
  await page.route(publicEndpoint, async (route) => {
    if (route.request().method() === "OPTIONS")
      return route.fulfill({
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "http://127.0.0.1:3000",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    count++;
    payload = route.request().postDataJSON();
    await pending;
    await route.fulfill({
      contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": "http://127.0.0.1:3000" },
      body: JSON.stringify({
        stored: true,
        delivery: "queued",
        downloadUrl: "https://api.ppf-test.example/70k-guide.pdf",
      }),
    });
  });
  await serve(page, configured);
  await page.getByLabel("Your email address").fill("owner@studio.example");
  await page.getByLabel("Your WhatsApp number").fill("9876543210");
  await page.getByRole("button", { name: "Get My Free Guide" }).click();
  await expect(
    page.getByRole("button", { name: "Saving your request…" }),
  ).toBeDisabled();
  await page
    .locator("form")
    .evaluate((form) =>
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      ),
    );
  expect(count).toBe(1);
  release();
  await expect(page.getByRole("status")).toContainText(
    "delivery by email is queued",
  );
  await expect(
    page.getByRole("link", { name: "Download Your Free Guide" }),
  ).toHaveAttribute("href", "https://api.ppf-test.example/70k-guide.pdf");
  expect(payload.email).toBe("owner@studio.example");
  expect(payload.whatsapp).toBe("+919876543210");
  expect(payload.captureMethod).toBe("email_and_whatsapp");
  expect(payload.deliveryChannel).toBe("email");
  expect(payload.marketingConsent).toBe(false);
  expect(payload.sourceCampaign).toBe("70k-ppf-offer-secret");
  expect(payload.requestId).toMatch(/^[0-9a-f-]{36}$/);
  const events = await page.evaluate(
    () => (window as unknown as { events: unknown[] }).events,
  );
  expect(JSON.stringify(events)).not.toContain("owner@studio.example");
  expect(JSON.stringify(events)).toContain("lead_form_submitted");
});
test("Systeme failure and unconfirmed receipts keep the request retryable", async ({
  page,
}) => {
  let attempts = 0;
  const ids: string[] = [];
  await page.route(publicEndpoint, (route) => {
    if (route.request().method() === "OPTIONS")
      return route.fulfill({
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "http://127.0.0.1:3000",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    ids.push(route.request().postDataJSON().requestId);
    attempts++;
    return route.fulfill({
      status: attempts === 1 ? 503 : 200,
      contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": "http://127.0.0.1:3000" },
      body: JSON.stringify({ stored: false, delivery: "unavailable" }),
    });
  });
  await serve(page, configured);
  await page.getByLabel("Your email address").fill("retry@studio.example");
  await page.getByLabel("Your WhatsApp number").fill("9876543210");
  await page.getByRole("button", { name: "Get My Free Guide" }).click();
  await expect(page.locator("#ppf-form-error")).toContainText(
    "could not be confirmed",
  );
  await page.getByRole("button", { name: "Get My Free Guide" }).click();
  await expect(page.locator("#ppf-form-error")).toContainText(
    "unconfirmed receipt",
  );
  await expect(page.getByRole("status")).toHaveCount(0);
  expect(ids[0]).toBe(ids[1]);
});

test("Systeme cover uses its configured asset at a larger mobile size and survives host alignment styles", async ({
  page,
}) => {
  const imageUrl = "https://assets.ppf-test.example/uploaded-guide-cover.png";
  await page.route(imageUrl, (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1055" height="1491"><rect width="1055" height="1491" fill="#111315"/></svg>',
    }),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await serve(
    page,
    source.replace(
      /guideCoverUrl:\s*(["'])[^"']*\1/,
      `guideCoverUrl: "${imageUrl}"`,
    ),
  );
  await page.addStyleTag({
    content:
      "body {text-align:center;} h1,h2,label,p {text-align:center;color:red;}",
  });
  const image = page.locator(".guide-cover-image");
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute("src", imageUrl);
  const box = await image.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(240);
  expect(box!.height / box!.width).toBeCloseTo(1491 / 1055, 1);
  expect(
    await page
      .locator(".hero-copy h1")
      .evaluate((el) => getComputedStyle(el).textAlign),
  ).toBe("left");
  expect(
    await page
      .locator(".input-label")
      .first()
      .evaluate((el) => getComputedStyle(el).textAlign),
  ).toBe("left");
  const form = await page.locator(".form-shell").boundingBox();
  expect(form!.y).toBeGreaterThan(box!.y + box!.height);
  expect(
    await page
      .locator(".primary-button")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe("rgb(199, 240, 0)");
});

for (const blockWidth of [320, 360, 390, 768]) {
  test(`Systeme narrow ${blockWidth}px block in a desktop editor stacks offer, cover, form`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const nested = `<div style="width:${blockWidth}px;margin:0 auto;text-align:center">${source}</div>`;
    await serve(page, nested);
    const heading = await page.locator(".hero-copy").boundingBox();
    const guide = await page.locator(".guide-card").boundingBox();
    const form = await page.locator(".form-shell").boundingBox();
    expect(guide!.y).toBeGreaterThanOrEqual(heading!.y + heading!.height);
    expect(form!.y).toBeGreaterThanOrEqual(guide!.y + guide!.height);
    expect(form!.width).toBeGreaterThan(Math.min(blockWidth - 40, 600));
    for (const selector of [
      ".hero-copy h1",
      ".guide-card",
      ".form-shell",
      ".input-wrap input",
      ".primary-button",
    ]) {
      const boxes = await page.locator(selector).evaluateAll((elements) =>
        elements.map((el) => {
          const rect = el.getBoundingClientRect();
          return { left: rect.left, right: rect.right };
        }),
      );
      const root = await page.locator("#ppf-landing").boundingBox();
      for (const box of boxes) {
        expect(box.left).toBeGreaterThanOrEqual(root!.x - 1);
        expect(box.right).toBeLessThanOrEqual(root!.x + root!.width + 1);
      }
    }
    await expect(page.getByLabel("Your email address")).toBeVisible();
    await expect(page.getByLabel("Your WhatsApp number")).toBeVisible();
    await page.screenshot({
      path: `test-results/systeme-embedded-${blockWidth}.png`,
      fullPage: true,
    });
  });
}

test("Systeme uses the supplied cover directly, including without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await serve(page);
  await expect(page.locator(".guide-cover-image")).toHaveAttribute(
    "src",
    suppliedCoverUrl,
  );
  await expect(page.locator(".guide-cover-image")).toHaveAttribute(
    "width",
    "1055",
  );
  await expect(page.locator(".guide-cover-image")).not.toHaveAttribute(
    "hidden",
    "",
  );
  await context.close();
});
