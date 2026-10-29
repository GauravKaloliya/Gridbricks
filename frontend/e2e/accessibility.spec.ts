import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = [
  { path: "/", heading: "January 2026 wind forecast performance" },
  { path: "/forecasts", heading: "Forecast explorer" },
  { path: "/accuracy", heading: "How close were the eligible forecasts?" },
  { path: "/data", heading: "Forecast and actual data table" },
];

for (const route of routes) {
  test(`${route.path} has no critical or serious accessibility violations`, async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "axe baseline runs on Chromium");
    await page.goto(route.path);
    await expect(
      page.getByRole("heading", { name: route.heading, level: 1 }),
    ).toBeVisible();
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations
      .filter(
        (violation) =>
          violation.impact === "critical" || violation.impact === "serious",
      )
      .map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        targets: violation.nodes.map((node) => node.target.join(" ")),
      }));

    expect(blocking).toEqual([]);
  });
}
