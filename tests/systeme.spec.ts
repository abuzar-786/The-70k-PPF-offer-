import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
const source = readFileSync("systemeio.html", "utf8");
const footer = readFileSync("systemeio-footer.html", "utf8");
const suppliedCoverUrl =
  "https://d1yei2z3i6k35z.cloudfront.net/1498607/6acce6c85f5cf7.16078938_PPFofferchecklistcoverph.png";
async function serve(page: Page, html = source) {
  await page.route("**/standalone-test", (route) =>
    route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">${html}</body></html>`,
    }),
  );
  await page.goto("/standalone-test");
}
// Representative image responses verify layout; they do not validate the live CDN.
test.beforeEach(async ({ page }) => {
  await page.route(suppliedCoverUrl, (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1055" height="1491"><rect width="1055" height="1491" fill="#111315"/></svg>',
    }),
  );
});
for (const width of [360, 390, 768, 1024, 1440]) {
  test(`form-free offer and guide at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width, height: 900 });
    await serve(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Selling ₹70K+ PPF Packages But Still Attracting Price Shoppers?",
    );
    await expect(page.locator("form, input, button")).toHaveCount(0);
    await expect(page.locator(".guide-cover-image")).toHaveAttribute(
      "src",
      suppliedCoverUrl,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
}
for (const width of [320, 360, 390, 768]) {
  test(`form-free ${width}px embed fits a desktop editor`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await serve(
      page,
      `<div style="width:${width}px;margin:0 auto;text-align:center">${source}</div>`,
    );
    const heading = await page.locator(".hero-copy").boundingBox();
    const guide = await page.locator(".guide-card").boundingBox();
    expect(guide!.y).toBeGreaterThanOrEqual(heading!.y + heading!.height);
    const root = await page.locator("#ppf-landing").boundingBox();
    for (const selector of [".hero-copy h1", ".guide-card", ".cover-frame"]) {
      const box = await page.locator(selector).boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(root!.x - 1);
      expect(box!.x + box!.width).toBeLessThanOrEqual(
        root!.x + root!.width + 1,
      );
    }
  });
}
test("a separate native form submits normally between offer and optional footer", async ({
  page,
}) => {
  let submitted = "";
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/native-submit", (route) => {
    submitted = route.request().postData() || "";
    return route.fulfill({
      contentType: "text/html",
      body: "Native form submitted",
    });
  });
  // A representative native HTML form checks that the custom block does not intercept submission.
  const native =
    '<section id="native-signup"><form method="post" action="/native-submit"><label>Email<input name="email" type="email" required /></label><label>WhatsApp<input name="whatsapp" type="tel" /></label><button type="submit">Get My Free Guide</button></form></section>';
  await page.setViewportSize({ width: 390, height: 900 });
  await serve(page, source + native + footer);
  const guide = await page.locator(".guide-card").boundingBox();
  const form = await page.locator("#native-signup").boundingBox();
  const bottom = await page.locator("#ppf-footer").boundingBox();
  expect(form!.y).toBeGreaterThanOrEqual(guide!.y + guide!.height);
  expect(bottom!.y).toBeGreaterThanOrEqual(form!.y + form!.height);
  await expect(page.locator("#ppf-landing form")).toHaveCount(0);
  await page.getByLabel("Email", { exact: true }).fill("native@studio.example");
  await page.getByLabel("WhatsApp", { exact: true }).fill("9876543210");
  await page.getByRole("button", { name: "Get My Free Guide" }).click();
  await expect(page.locator("body")).toHaveText("Native form submitted");
  expect(new URLSearchParams(submitted).get("email")).toBe(
    "native@studio.example",
  );
  expect(errors).toEqual([]);
});
test("cover and optional footer render without a custom lead API or script errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await serve(page, source + footer);
  await expect(page.locator("#ppf-footer")).toBeVisible();
  await expect(page.locator("#ppf-copyright")).toContainText(
    "PPF Growth Resources",
  );
  await expect(page.locator("form, input, button")).toHaveCount(0);
  expect(source).not.toContain("leadEndpoint");
  expect(source).not.toContain("fetch(");
  expect(source).not.toContain("/api/leads");
  expect(errors).toEqual([]);
});
