import { test, expect } from "./fixtures";
import { NAV_ITEMS } from "../../src/shared/config/navigation";

test.describe("Dashboard & Onboarding", () => {
  test("overview tab loads and shows either the Copilot zero-state or KPI cards", async ({ page, gotoTab }) => {
    await gotoTab("overview");

    const copilotHero = page.getByRole("heading", { name: /what do you want to achieve/i });
    const kpiCards = page.getByText(/messages delivered|wallet balance/i).first();

    await expect(copilotHero.or(kpiCards)).toBeVisible({ timeout: 20_000 });
  });

  test("zero-state Copilot textarea accepts a prompt and shows example chips", async ({ page, gotoTab }) => {
    await gotoTab("overview");

    const copilotHero = page.getByRole("heading", { name: /what do you want to achieve/i });
    if (!(await copilotHero.isVisible().catch(() => false))) {
      test.skip(true, "Org is past zero-state (campaign already sent) — Copilot hero not shown");
    }

    const input = page.getByPlaceholder(/re-engage customers who went quiet/i);
    await expect(input).toBeVisible();
    await input.fill("Send a 20% discount to inactive customers");

    await expect(page.getByText(/Send a 20% Diwali discount/i)).toBeVisible();
  });

  test("clicking an example chip routes to Campaigns with a goal param", async ({ page, gotoTab }) => {
    await gotoTab("overview");

    const chip = page.getByRole("button", { name: /win back leads who never replied/i });
    if (!(await chip.isVisible().catch(() => false))) {
      test.skip(true, "Org is past zero-state — example chips not shown");
    }

    await chip.click();
    await expect(page).toHaveURL(/tab=campaigns/);
    await expect(page).toHaveURL(/goal=/);
  });

  test("AI Copilot sidebar opens from the header button", async ({ page, gotoTab }) => {
    await gotoTab("overview");

    await page.getByRole("button", { name: "AI Copilot", exact: true }).first().click();
    await expect(page.getByRole("textbox").last()).toBeVisible({ timeout: 10_000 });
  });

  test("activity / system log stream renders", async ({ page, gotoTab }) => {
    await gotoTab("overview");

    const copilotHero = page.getByRole("heading", { name: /what do you want to achieve/i });
    const recentActivity = page.getByText(/recent activity/i).first();

    await expect(copilotHero.or(recentActivity)).toBeVisible({ timeout: 20_000 });

    if (await copilotHero.isVisible().catch(() => false)) {
      test.skip(true, "Org is in zero-state — Recent Activity section not shown");
    }

    await expect(recentActivity).toBeVisible();
  });

  test("sidebar navigation links to every tab", async ({ page, gotoTab, orgId }) => {
    await gotoTab("overview");

    for (const item of NAV_ITEMS) {
      // .last() avoids the group-header toggle button when a group's label
      // matches its only item's label (e.g. "Settings").
      await page.getByRole("button", { name: item.label, exact: true }).last().click();
      await expect(page).toHaveURL(new RegExp(`tab=${item.id}`), { timeout: 15_000 });
    }
  });
});
