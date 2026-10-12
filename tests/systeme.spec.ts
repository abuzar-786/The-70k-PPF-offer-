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
test("Systeme validates both channels and never invents capture without integration", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await serve(page);
  await expect(
    page.getByRole("checkbox", { name: /occasional studio/ }),
  ).not.toBeChecked();
  await page.getByLabel("WhatsApp", { exact: true }).check();
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
  await page.getByLabel("Email", { exact: true }).check();
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
  expect(payload.contact).toBe("owner@studio.example");
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
