import { test, expect } from "@playwright/test";
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
  test(`Next.js offer and cover remain responsive without a custom form at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
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
    await expect(page.locator("footer")).toBeVisible();
  });
}
