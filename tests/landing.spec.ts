import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
for (const width of [360, 390, 768, 1024, 1440]) {
  test(`responsive layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Selling ₹70K+ PPF Packages But Still Attracting Price Shoppers?",
    );
    await expect(
      page.getByRole("button", { name: "Get My Free Guide" }),
    ).toBeVisible();
    if (width < 768) {
      const form = await page.locator(".form-shell").boundingBox();
      const cover = await page.locator(".guide-card").boundingBox();
      expect(form!.y).toBeLessThan(cover!.y);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    if (width >= 1024) {
      const box = await page
        .getByRole("button", { name: "Get My Free Guide" })
        .boundingBox();
      expect(box!.y + box!.height).toBeLessThan(900);
    }
    await page.screenshot({
      path: `test-results/landing-${width}.png`,
      fullPage: true,
    });
  });
}
test("combined fields, client validation, explicit local receipt and privacy defaults", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const events: unknown[] = [];
    (window as unknown as { ppfEvents: unknown[] }).ppfEvents = events;
    window.addEventListener("ppf:analytics", (event) =>
      events.push((event as CustomEvent).detail),
    );
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const calls: string[] = [];
  page.on("request", (request) => calls.push(request.url()));
  await page.goto("/?utm_source=browser-test&utm_campaign=ppf");
  await expect(
    page.getByRole("checkbox", { name: /occasional studio/ }),
  ).not.toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: /Allow optional analytics/ }),
  ).not.toBeChecked();
  await expect(page.getByRole("radio")).toHaveCount(0);
  await page
    .getByLabel("Your email address")
    .fill(`browser-${randomUUID()}@studio.example`);
  await expect(page.getByLabel("Your WhatsApp number")).toBeVisible();
  await expect(page.getByLabel("Your email address")).toBeVisible();
  await page.getByLabel("Your WhatsApp number").fill("1234");
  await page.getByRole("button", { name: "Get My Free Guide" }).click();
  await expect(page.locator("#form-error")).toContainText(
    "valid 10-digit Indian",
  );
  await page.getByLabel("Your WhatsApp number").fill("+91 98765 43210");
  await page
    .getByLabel("Your email address")
    .fill(`browser-${randomUUID()}@studio.example`);
  await page.getByRole("button", { name: "Get My Free Guide" }).click();
  await expect(
    page.getByRole("heading", { name: "Test request saved" }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText(
    "No email or WhatsApp message was sent.",
  );
  await expect(page.getByRole("status")).toContainText(
    "No download is available.",
  );
  expect(
    calls.filter(
      (url) => url.includes("facebook") || url.includes("googletagmanager"),
    ),
  ).toHaveLength(0);
  expect(errors).toEqual([]);
  const analytics = await page.evaluate(
    () =>
      (window as unknown as { ppfEvents: Record<string, unknown>[] }).ppfEvents,
  );
  expect(analytics.map((e) => e.event)).toContain("lead_form_submitted");
  expect(JSON.stringify(analytics)).not.toContain("@studio.example");
});
test("API validates, stores consent/attribution and deduplicates retries", async ({
  request,
}) => {
  const id = randomUUID();
  const data = {
    method: "email",
    email: "owner@studio.example",
    whatsapp: "+91 98765 43210",
    requestId: id,
    marketingConsent: false,
    utm: { utm_source: "integration-test" },
  };
  const first = await request.post("/api/leads", { data });
  expect(first.status()).toBe(200);
  expect((await first.json()).status).toBe("development");
  const stored = JSON.parse(
    await readFile(
      path.join(process.cwd(), ".data/leads", `${id}.json`),
      "utf8",
    ),
  );
  expect(stored.email).toBe("owner@studio.example");
  expect(stored.whatsapp).toBe("+919876543210");
  expect(stored.captureMethod).toBe("email_and_whatsapp");
  expect(stored.deliveryChannel).toBe("email");
  expect(stored.consent.whatsappGuideRequested).toBe(false);
  expect(stored.consent.marketingChannels).toEqual([]);
  expect(stored.consent.marketing).toBe(false);
  expect(stored.utm.utm_source).toBe("integration-test");
  expect(stored.sourceCampaign).toBe("70k-ppf-offer-secret");
  const repeat = await request.post("/api/leads", { data });
  expect(repeat.status()).toBe(200);
  const again = JSON.parse(
    await readFile(
      path.join(process.cwd(), ".data/leads", `${id}.json`),
      "utf8",
    ),
  );
  expect(again.submittedAt).toBe(stored.submittedAt);
  expect(
    (
      await request.post("/api/leads", {
        data: { ...data, whatsapp: "+91 87654 32109" },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await request.post("/api/leads", {
        data: { ...data, requestId: randomUUID(), whatsapp: "1234" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/leads", {
        data,
        headers: { origin: "https://foreign.example" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/leads", {
        data: { ...data, utm: { utm_source: "x".repeat(9000) } },
      })
    ).status(),
  ).toBe(413);
  expect((await request.get("/api/guide")).status()).toBe(404);
});
test("failed request exposes retry state instead of a false success", async ({
  page,
}) => {
  await page.goto("/");
  await page.route("**/api/leads", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Guide requests are not available yet." }),
    }),
  );
  await page.getByLabel("Your email address").fill("retry@studio.example");
  await page.getByLabel("Your WhatsApp number").fill("9876543210");
  await page.getByRole("button", { name: "Get My Free Guide" }).click();
  await expect(page.locator("#form-error")).toContainText("not available");
  await expect(
    page.getByRole("button", { name: "Get My Free Guide" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("heading", { name: "Test request saved" }),
  ).toHaveCount(0);
});
test("pending submission disables controls and blocks concurrent attempts", async ({
  page,
}) => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requests = 0;
  await page.goto("/");
  await page.route("**/api/leads", async (route) => {
    requests++;
    await held;
    await route.continue();
  });
  await page
    .getByLabel("Your email address")
    .fill(`loading-${randomUUID()}@studio.example`);
  await page.getByLabel("Your WhatsApp number").fill("9876543210");
  await page.getByRole("button", { name: "Get My Free Guide" }).click();
  await expect(
    page.getByRole("button", { name: "Saving your request…" }),
  ).toBeDisabled();
  await expect(page.getByLabel("Your email address")).toBeDisabled();
  await page
    .locator("form")
    .evaluate((form) =>
      (form as HTMLFormElement).dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      ),
    );
  expect(requests).toBe(1);
  release();
  await expect(
    page.getByRole("heading", { name: "Test request saved" }),
  ).toBeVisible();
});
test("without JavaScript the form never exposes contact details in URL parameters", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3000");
  await expect(page.locator("form")).toHaveAttribute("method", "post");
  await expect(
    page.getByRole("button", { name: "Get My Free Guide" }),
  ).toBeDisabled();
  await expect(page.getByLabel("Your email address")).toBeDisabled();
  expect(await page.locator("noscript").textContent()).toContain(
    "Enable JavaScript to request your guide.",
  );
  await expect(page.locator("noscript")).toBeVisible();
  await context.close();
});
