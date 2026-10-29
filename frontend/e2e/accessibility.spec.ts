import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const routes = [
  { path: "/", heading: "January 2026 wind forecast performance" },
  { path: "/forecasts", heading: "Forecast explorer" },
  { path: "/accuracy", heading: "How close were the eligible forecasts?" },
  { path: "/data", heading: "Forecast and actual data table" },
];

async function expectNoBlockingViolations(page: Page) {
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
}

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

    await expectNoBlockingViolations(page);
  });
}

test("theme chooser has no critical or serious accessibility violations", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "axe baseline runs on Chromium");
  await page.addInitScript(() => localStorage.removeItem("gridbricks.theme"));
  await page.goto("/");
  await expect(
    page.getByRole("dialog", { name: "Choose how Gridbricks looks" }),
  ).toBeVisible();

  await expectNoBlockingViolations(page);
});

test("site guide has no critical or serious accessibility violations", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "axe baseline runs on Chromium");
  await page.goto("/");
  await page.getByRole("button", { name: "Open the site guide" }).click();
  await expect(
    page.getByRole("dialog", { name: "Welcome to Gridbricks" }),
  ).toBeVisible();

  await expectNoBlockingViolations(page);
});

test("dark theme overview has no critical or serious accessibility violations", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "axe baseline runs on Chromium");
  await page.addInitScript(() =>
    localStorage.setItem("gridbricks.theme", "dark"),
  );
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("heading", {
      name: "January 2026 wind forecast performance",
      level: 1,
    }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");

  await expectNoBlockingViolations(page);
});
