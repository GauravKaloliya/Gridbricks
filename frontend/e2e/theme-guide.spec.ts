import { expect, test } from "@playwright/test";

import { GUIDE_STEPS } from "../src/lib/guide";

const THEME_DIALOG = "Choose how Gridbricks looks";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function overlaps(a: Rect, b: Rect) {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

test.describe("theme chooser on a first visit", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("asks on the first visit, previews and saves a choice, then stays quiet", async ({
    page,
  }) => {
    await page.goto("/");

    const dialog = page.getByRole("dialog", { name: THEME_DIALOG });
    await expect(dialog).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "paper");
    await expect(dialog.getByRole("radio", { name: /^Paper/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    await dialog.getByRole("radio", { name: /^Light/ }).click();
    await expect(dialog.getByRole("radio", { name: /^Light/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    await dialog.getByRole("button", { name: "Continue with Light" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(
      await page.evaluate(() => localStorage.getItem("gridbricks.theme")),
    ).toBe("light");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(
      page.getByRole("dialog", { name: THEME_DIALOG }),
    ).toHaveCount(0);
  });

  test("closing without choosing asks again on the next visit", async ({
    page,
  }) => {
    await page.goto("/");

    const dialog = page.getByRole("dialog", { name: THEME_DIALOG });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    expect(
      await page.evaluate(() => localStorage.getItem("gridbricks.theme")),
    ).toBeNull();

    await page.reload();
    await expect(
      page.getByRole("dialog", { name: THEME_DIALOG }),
    ).toBeVisible();
  });

  test("arrow keys preview a theme and Escape restores the committed one", async ({
    page,
  }) => {
    await page.goto("/");

    const dialog = page.getByRole("dialog", { name: THEME_DIALOG });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(dialog.getByRole("radio", { name: /^Light/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.keyboard.press("Escape");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "paper");
    expect(
      await page.evaluate(() => localStorage.getItem("gridbricks.theme")),
    ).toBeNull();
  });

});

test.describe("theme chooser for a returning visitor", () => {
  test("the header control reopens the chooser and applies a new theme", async ({
    page,
  }) => {
    await page.goto("/");

    const dialog = page.getByRole("dialog", { name: THEME_DIALOG });
    await expect(dialog).toHaveCount(0);
    await page.getByRole("button", { name: /Change appearance/ }).click();
    await expect(dialog).toBeVisible();

    await dialog.getByRole("radio", { name: /^Dark/ }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await dialog.getByRole("button", { name: "Continue with Dark" }).click();
    await expect(dialog).toHaveCount(0);
    expect(
      await page.evaluate(() => localStorage.getItem("gridbricks.theme")),
    ).toBe("dark");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(
      page.getByRole("dialog", { name: THEME_DIALOG }),
    ).toHaveCount(0);
  });
});

test.describe("site guide", () => {
  test("starts from the header and supports Continue, Back, Exit and Escape", async ({
    page,
  }) => {
    await page.goto("/");
    const trigger = page.getByRole("button", { name: "Open the site guide" });
    await trigger.click();

    const welcome = page.getByRole("dialog", { name: GUIDE_STEPS[0].title });
    await expect(welcome).toBeVisible();
    await expect(
      welcome.getByText(`Step 1 of ${GUIDE_STEPS.length}`, { exact: true }),
    ).toBeVisible();
    await expect(welcome.getByRole("button", { name: "Exit" })).toBeVisible();

    await welcome.getByRole("button", { name: "Continue", exact: true }).click();
    const dates = page.getByRole("dialog", { name: GUIDE_STEPS[1].title });
    await expect(dates).toBeVisible();
    await expect(
      dates.getByText(`Step 2 of ${GUIDE_STEPS.length}`, { exact: true }),
    ).toBeVisible();
    await expect(page.locator('[data-tour="date-range"]')).toBeVisible();
    await expect(dates.getByRole("button", { name: "Back" })).toBeVisible();

    await dates.getByRole("button", { name: "Back" }).click();
    await expect(welcome).toBeVisible();

    await welcome.getByRole("button", { name: "Exit" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(trigger).toBeFocused();

    await trigger.click();
    await expect(welcome).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("freezes the page and keeps the card clear of the spotlight", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "Freeze checks run on Chromium");
    await page.goto("/?start=2026-01-01&end=2026-01-07");
    await page.evaluate(() => window.scrollTo(0, 0));

    await page.getByRole("button", { name: "Open the site guide" }).click();
    const welcome = page.getByRole("dialog", { name: GUIDE_STEPS[0].title });
    await expect(welcome).toBeVisible();

    await expect(page.locator("#root")).toHaveAttribute("inert", "");
    await expect(page.locator("html")).toHaveCSS("overflow", "hidden");
    await expect(page.locator("body")).toHaveCSS("overflow", "hidden");

    const scrollBefore = await page.evaluate(() => window.scrollY);
    await page.mouse.move(720, 500);
    await page.mouse.wheel(0, 1400);
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);

    await welcome.getByRole("button", { name: "Continue", exact: true }).click();
    const dates = page.getByRole("dialog", { name: GUIDE_STEPS[1].title });
    await expect(dates).toBeVisible();

    const spotlight = page.locator("[data-guide-spotlight]");
    await expect(spotlight).toBeVisible();

    const cardBox = await dates.boundingBox();
    const spotBox = await spotlight.boundingBox();
    expect(cardBox).not.toBeNull();
    expect(spotBox).not.toBeNull();
    expect(overlaps(cardBox!, spotBox!)).toBe(false);

    const viewport = page.viewportSize()!;
    expect(spotBox!.x).toBeGreaterThanOrEqual(0);
    expect(spotBox!.y).toBeGreaterThanOrEqual(0);
    expect(spotBox!.x + spotBox!.width).toBeLessThanOrEqual(viewport.width);
    expect(spotBox!.y + spotBox!.height).toBeLessThanOrEqual(viewport.height);
    expect(cardBox!.y).toBeGreaterThanOrEqual(0);
    expect(cardBox!.y + cardBox!.height).toBeLessThanOrEqual(viewport.height);

    await dates.getByRole("button", { name: "Exit" }).click();
    await expect(page.locator("#root")).not.toHaveAttribute("inert", "");
    await expect(page.locator("html")).not.toHaveCSS("overflow", "hidden");
    await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  });

  test("keeps a medium section fully inside the spotlight", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "Geometry checks run on Chromium");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/?start=2026-01-01&end=2026-01-07");
    await page.getByRole("button", { name: "Open the site guide" }).click();

    const cutoffIndex = GUIDE_STEPS.findIndex(
      (step) => step.target === "cutoff-method",
    );
    for (let index = 0; index < cutoffIndex; index += 1) {
      await page
        .getByRole("dialog", { name: GUIDE_STEPS[index].title })
        .getByRole("button", { name: "Continue", exact: true })
        .click();
      await expect(
        page.getByRole("dialog", { name: GUIDE_STEPS[index + 1].title }),
      ).toBeVisible();
    }

    const spotlight = page.locator("[data-guide-spotlight]");
    await expect(spotlight).toBeVisible();
    const target = await page.locator('[data-tour="cutoff-method"]').boundingBox();
    const spot = await spotlight.boundingBox();
    expect(target).not.toBeNull();
    expect(spot).not.toBeNull();
    expect(spot!.x).toBeLessThanOrEqual(target!.x + 0.5);
    expect(spot!.y).toBeLessThanOrEqual(target!.y + 0.5);
    expect(spot!.x + spot!.width).toBeGreaterThanOrEqual(
      target!.x + target!.width - 0.5,
    );
    expect(spot!.y + spot!.height).toBeGreaterThanOrEqual(
      target!.y + target!.height - 0.5,
    );
  });

  test("walks every page and finishes on the overview", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "The 19-step tour runs on Chromium");
    test.setTimeout(120_000);

    await page.goto("/?start=2026-01-01&end=2026-01-07");
    await page.getByRole("button", { name: "Open the site guide" }).click();

    for (let index = 0; index < GUIDE_STEPS.length; index += 1) {
      const step = GUIDE_STEPS[index];
      const dialog = page.getByRole("dialog", { name: step.title });
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByText(`Step ${index + 1} of ${GUIDE_STEPS.length}`, {
          exact: true,
        }),
      ).toBeVisible();
      await expect(page.locator("#root")).toHaveAttribute("inert", "");

      if (step.target) {
        const spotlight = page.locator("[data-guide-spotlight]");
        await expect(spotlight).toBeVisible();
        const cardBox = await dialog.boundingBox();
        const spotBox = await spotlight.boundingBox();
        expect(cardBox).not.toBeNull();
        expect(spotBox).not.toBeNull();
        expect(overlaps(cardBox!, spotBox!)).toBe(false);
      }

      if (step.route) {
        await expect
          .poll(() => new URL(page.url()).pathname)
          .toBe(step.route);
      }
      if (step.target) {
        await expect(
          page.locator(`[data-tour="${step.target}"]`),
        ).toBeVisible();
      }

      if (index === GUIDE_STEPS.length - 1) {
        const search = new URL(page.url()).search;
        await dialog.getByRole("button", { name: "Finish" }).click();
        await expect(page.getByRole("dialog")).toHaveCount(0);
        expect(new URL(page.url()).pathname).toBe("/");
        expect(new URL(page.url()).search).toBe(search);
        return;
      }

      await dialog
        .getByRole("button", { name: "Continue", exact: true })
        .click();
    }
  });
});

test.describe("mobile layout", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("keeps the chooser and guide inside the viewport", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "Mobile layout checks run on Chromium");
    await page.addInitScript(() =>
      localStorage.removeItem("gridbricks.theme"),
    );
    await page.goto("/");

    const themeDialog = page.getByRole("dialog", { name: THEME_DIALOG });
    await expect(themeDialog).toBeVisible();
    await themeDialog.evaluate((element) =>
      Promise.all(
        element.getAnimations().map((animation) => animation.finished),
      ),
    );
    const modalBox = await themeDialog.boundingBox();
    expect(modalBox).not.toBeNull();
    expect(modalBox!.y + modalBox!.height).toBeLessThanOrEqual(845);

    await themeDialog.getByRole("radio", { name: /^Dark/ }).click();
    await themeDialog.getByRole("button", { name: "Continue with Dark" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.getByRole("button", { name: "Open the site guide" }).click();
    const welcome = page.getByRole("dialog", { name: GUIDE_STEPS[0].title });
    await expect(welcome).toBeVisible();
    const welcomeBox = await welcome.boundingBox();
    expect(welcomeBox).not.toBeNull();
    expect(welcomeBox!.y + welcomeBox!.height).toBeLessThanOrEqual(845);

    await welcome.getByRole("button", { name: "Continue", exact: true }).click();
    const dates = page.getByRole("dialog", { name: GUIDE_STEPS[1].title });
    await expect(dates).toBeVisible();
    await expect(dates.getByRole("button", { name: "Exit" })).toBeVisible();
    await expect(
      dates.getByRole("button", { name: "Continue", exact: true }),
    ).toBeVisible();
    const spotlight = page.locator("[data-guide-spotlight]");
    await expect(spotlight).toBeVisible();

    // The card holds its previous position until the spotlight is ready, so
    // measure it only once the spotlight has arrived.
    const datesBox = await dates.boundingBox();
    expect(datesBox).not.toBeNull();
    expect(datesBox!.y + datesBox!.height).toBeLessThanOrEqual(845);

    const spotBox = await spotlight.boundingBox();
    expect(spotBox).not.toBeNull();
    expect(overlaps(datesBox!, spotBox!)).toBe(false);
  });
});
