import { expect, test } from "@playwright/test";

const DEFAULT_COVERAGE =
  "168 of 168 hourly intervals have an eligible forecast and both actual halves.";
const FULL_MONTH_COVERAGE =
  "744 of 744 hourly intervals have an eligible forecast and both actual halves.";

test("selecting the full month updates metrics, chart, and downstream views", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "January 2026 wind forecast performance",
    }),
  ).toBeVisible();
  await expect(page.getByText(DEFAULT_COVERAGE)).toBeVisible();
  await expect(
    page.locator('[aria-label="Forecast versus actual wind generation chart"]'),
  ).toBeVisible();

  await page.getByRole("button", { name: "Full January" }).click();

  await expect(page).toHaveURL(/start=2026-01-01&end=2026-01-31/);
  await expect(page.getByText(FULL_MONTH_COVERAGE)).toBeVisible();

  await page.getByRole("link", { name: "Data table" }).click();
  await expect(
    page.getByRole("heading", { name: "Forecast and actual data table" }),
  ).toBeVisible();
  await expect(
    page.getByText("Showing 1–25 of 744 hourly intervals"),
  ).toBeVisible();
});

test("chart tooltip tracks the pointer without animated drift", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText(DEFAULT_COVERAGE)).toBeVisible();

  const chart = page.locator(
    '[aria-label="Forecast versus actual wind generation chart"]',
  );
  await chart.scrollIntoViewIfNeeded();
  await expect(chart).toBeVisible();

  const box = await chart.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;

  const tooltip = page.locator(".recharts-tooltip-wrapper");
  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.5);
  await expect(tooltip).toBeVisible();
  await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.5);
  await page.waitForTimeout(50);

  const immediate = await tooltip.boundingBox();
  await page.waitForTimeout(450);
  const settled = await tooltip.boundingBox();

  expect(immediate).not.toBeNull();
  expect(settled).not.toBeNull();
  expect(Math.abs((immediate?.x ?? 0) - (settled?.x ?? 0))).toBeLessThan(1);
  expect(Math.abs((immediate?.y ?? 0) - (settled?.y ?? 0))).toBeLessThan(1);
});

test("forecast explorer shows the eligible version and excludes later revisions", async ({
  page,
}) => {
  await page.goto("/forecasts");

  await expect(
    page.getByRole("heading", { name: "Forecast explorer" }),
  ).toBeVisible();
  await expect(page.getByText(/01 Jan 2026.*00:00/).first()).toBeVisible();
  await expect(page.getByText(/31 Dec 2025.*09:30/).first()).toBeVisible();
  await expect(page.getByText("Eligible versions")).toBeVisible();
  await expect(page.getByText("12", { exact: true })).toBeVisible();

  await expect(page.getByText("Forecast revision audit")).toBeVisible();
  await expect(page.getByText("After cutoff — excluded").first()).toBeVisible();
  await expect(page.getByText("Selected", { exact: true }).first()).toBeVisible();

  await page.getByLabel("Delivery day").selectOption("2026-01-02");
  await expect(page.getByText(/02 Jan 2026.*00:00/).first()).toBeVisible();
  await expect(page.getByText("Forecast revision audit")).toBeVisible();
});

test("accuracy analysis shows metrics, definitions, and error chart", async ({
  page,
}) => {
  await page.goto("/accuracy");

  await expect(
    page.getByRole("heading", { name: "How close were the eligible forecasts?" }),
  ).toBeVisible();
  await expect(page.getByText("MAE", { exact: true })).toBeVisible();
  await expect(page.getByText("RMSE", { exact: true })).toBeVisible();
  await expect(page.getByText("Mean signed error", { exact: true })).toBeVisible();
  await expect(page.getByText("Metric definitions")).toBeVisible();
  await expect(page.getByText("MAE — mean absolute error")).toBeVisible();
  await expect(
    page.locator('[aria-label="Signed forecast error chart"]'),
  ).toBeVisible();
  await expect(page.getByText("Matched hours used in metrics")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Decision support" }),
  ).toBeVisible();
  await expect(page.getByText("P90 shortfall", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Accuracy by forecast lead time" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Largest misses" }),
  ).toBeVisible();

  const firstAudit = page.locator('a[href*="/forecasts?"]').first();
  await expect(firstAudit).toBeVisible();
  await firstAudit.click();
  await expect(page).toHaveURL(/\/forecasts\?/);
  await expect(page).toHaveURL(/interval=/);
  await expect(
    page.getByRole("heading", { name: "Selected delivery interval" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Forecast revision audit" }),
  ).toBeVisible();
});

test("data page switches between hourly intervals and half-hourly actuals", async ({
  page,
}) => {
  await page.goto("/data");

  await expect(
    page.getByRole("heading", { name: "Forecast and actual data table" }),
  ).toBeVisible();
  await expect(
    page.getByText("Showing 1–25 of 168 hourly intervals"),
  ).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(
    "gridbricks-intervals-2026-01-01_2026-01-07.csv",
  );

  await page.getByRole("tab", { name: "Half-hourly actuals" }).click();
  await expect(
    page.getByRole("columnheader", { name: "Settlement period start" }),
  ).toBeVisible();
  await expect(
    page.getByText("Showing 1–50 of 336 half-hour records"),
  ).toBeVisible();

  await page.getByRole("button", { name: "Full January" }).click();
  await expect(
    page.getByText("Showing 1–50 of 1,488 half-hour records"),
  ).toBeVisible();
  await expect(page.getByText("1,488", { exact: true })).toBeVisible();
  await expect(page.getByText("744", { exact: true })).toBeVisible();

  await page.getByRole("tab", { name: "Hourly analysis intervals" }).click();
  await expect(page.getByText("744 usable of 744")).toBeVisible();
});

test("an API failure is visible and retry recovers without substituted values", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText(DEFAULT_COVERAGE)).toBeVisible();

  await page.route("**/api/accuracy**", (route) => route.abort());
  await page.getByRole("button", { name: "Full January" }).click();

  const alert = page.getByRole("alert");
  await expect(alert).toContainText("Could not load the analysis");
  await expect(alert).toContainText("Could not reach the analytics API");

  await page.unroute("**/api/accuracy**");
  await page.getByRole("button", { name: "Retry request" }).click();
  await expect(page.getByText(FULL_MONTH_COVERAGE)).toBeVisible();
});
