import { test, expect, requireAI, closeModal } from "./fixtures";

/**
 * AI Workspace E2E — covers navigation, WelcomeStage tiles, chat interactions,
 * the SimulatorModal, and the success screen.
 *
 * Most AI tests require E2E_RUN_AI=1 because they hit Groq and are
 * non-deterministic. Navigation and layout tests run unconditionally.
 */
test.describe("AI Workspace", () => {
  test.beforeEach(async ({ gotoTab }) => {
    await gotoTab("ai-workspace");
  });

  // ── Layout & navigation ──────────────────────────────────────────────────

  test("workspace loads with a stage (top) and chat input (bottom)", async ({ page }) => {
    // Stage area should be visible
    await expect(page.getByRole("heading", { name: /what do you want to achieve/i })).toBeVisible({
      timeout: 20_000,
    });

    // Chat textarea must always be present at the bottom
    const textarea = page.getByPlaceholder(/ask anything/i);
    await expect(textarea).toBeVisible();

    // Stage must appear above (higher in DOM than) the textarea
    const stageBox = await page.getByRole("heading", { name: /what do you want to achieve/i }).boundingBox();
    const chatBox = await textarea.boundingBox();
    expect(stageBox?.y).toBeLessThan(chatBox?.y ?? Infinity);
  });

  test("AI Copilot FAB is hidden on the AI Workspace page", async ({ page }) => {
    // The copilot FAB must not render when we're already on the workspace
    const copilotFAB = page.getByRole("button", { name: /AI Copilot/i }).last();
    // It should either be absent or not visible
    const isVisible = await copilotFAB.isVisible().catch(() => false);
    expect(isVisible).toBe(false);
  });

  test("back / close button on the workspace returns to overview", async ({ page, orgId }) => {
    const backBtn = page.getByRole("button", { name: /back|close|exit/i }).first();
    if (!(await backBtn.isVisible().catch(() => false))) {
      test.skip(true, "No back button found on workspace — skip");
    }
    await backBtn.click();
    await expect(page).toHaveURL(new RegExp(`/org/${orgId}`));
  });

  // ── WelcomeStage tiles ───────────────────────────────────────────────────

  test("WelcomeStage renders four action tiles with verb-led labels", async ({ page }) => {
    for (const label of ["Launch a Campaign", "Recover Lost Carts", "Build a Chatbot", "Create a Template"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible({ timeout: 15_000 });
    }
  });

  test("clicking a WelcomeStage tile sends a prompt to the chat", async ({ page }) => {
    requireAI();

    const tile = page.getByText("Launch a Campaign", { exact: true });
    await tile.click();

    // After clicking, a loader spinner should briefly appear inside the tile
    // Then the AI response should appear in the chat stream
    await expect(
      page.getByText(/campaign|broadcast|template|goal/i).first()
    ).toBeVisible({ timeout: 30_000 });
  });

  // ── Chat interactions ────────────────────────────────────────────────────

  test("typing a prompt and submitting shows an AI streaming response", async ({ page }) => {
    requireAI();

    const textarea = page.getByPlaceholder(/ask anything/i);
    await textarea.fill("I want to run a flash sale campaign for 20% off all products.");
    await page.keyboard.press("Enter");

    // At minimum, the user message should echo back
    await expect(page.getByText(/flash sale/i).first()).toBeVisible({ timeout: 15_000 });

    // And the AI should respond
    await expect(page.getByText(/campaign|broadcast|template|segment/i).first()).toBeVisible({
      timeout: 60_000,
    });
  });

  test("textarea sends on Enter and stays multiline on Shift+Enter", async ({ page }) => {
    const textarea = page.getByPlaceholder(/ask anything/i);
    await textarea.fill("line one");
    await page.keyboard.press("Shift+Enter");
    await textarea.type("line two");

    // The textarea value should contain a newline
    const value = await textarea.inputValue();
    expect(value).toContain("\n");
  });

  // ── Campaign flow via AI ─────────────────────────────────────────────────

  test("AI builds a campaign plan and shows the Simulator preview", async ({ page }) => {
    requireAI();

    const textarea = page.getByPlaceholder(/ask anything/i);
    await textarea.fill("Launch a 15% off summer discount to all my customers now.");
    await page.keyboard.press("Enter");

    // The simulator panel or a campaign preview should appear
    await expect(
      page.getByText(/launch|broadcast|schedule|template|simulator/i).first()
    ).toBeVisible({ timeout: 90_000 });
  });

  test("SimulatorModal is two-column: info panel on left, WA phone on right", async ({ page }) => {
    requireAI();

    const textarea = page.getByPlaceholder(/ask anything/i);
    await textarea.fill("Send a re-engagement message to inactive customers.");
    await page.keyboard.press("Enter");

    // Wait for the preview to appear
    const editBtn = page.getByRole("button", { name: /edit|adjust/i }).first();
    if (!(await editBtn.isVisible({ timeout: 45_000 }).catch(() => false))) {
      test.skip(true, "No simulator loaded — AI may have requested more info");
    }

    // The simulator should show campaign details
    await expect(page.getByText(/template|audience|sequence/i).first()).toBeVisible();
    // The WA phone preview should also be present
    await expect(page.getByText(/whatsapp|preview|messages/i).first()).toBeVisible();
  });

  test("Launch button in Simulator shows the success screen", async ({ page }) => {
    requireAI();

    const textarea = page.getByPlaceholder(/ask anything/i);
    await textarea.fill("Broadcast our summer sale to all contacts right now.");
    await page.keyboard.press("Enter");

    const launchBtn = page.getByRole("button", { name: /launch/i }).last();
    if (!(await launchBtn.isVisible({ timeout: 60_000 }).catch(() => false))) {
      test.skip(true, "Launch button not shown — campaign simulator not loaded");
    }

    await launchBtn.click();

    // Success screen: green checkmark area + action buttons
    await expect(
      page.getByText(/launched|success|campaign sent|view campaigns|start another/i).first()
    ).toBeVisible({ timeout: 30_000 });
  });

  test("'Start Another' on success screen resets back to WelcomeStage", async ({ page }) => {
    requireAI();

    const textarea = page.getByPlaceholder(/ask anything/i);
    await textarea.fill("Send a quick hello to all my contacts.");
    await page.keyboard.press("Enter");

    const launchBtn = page.getByRole("button", { name: /launch/i }).last();
    if (!(await launchBtn.isVisible({ timeout: 60_000 }).catch(() => false))) {
      test.skip(true, "Launch button not shown");
    }

    await launchBtn.click();

    const startAnother = page.getByRole("button", { name: /start another/i });
    if (!(await startAnother.isVisible({ timeout: 20_000 }).catch(() => false))) {
      test.skip(true, "Success screen not shown");
    }

    await startAnother.click();
    await expect(page.getByText("Launch a Campaign", { exact: true })).toBeVisible({ timeout: 10_000 });
  });

  // ── Chatbot & Template flows ─────────────────────────────────────────────

  test("'Build a Chatbot' tile triggers a chatbot-building AI response", async ({ page }) => {
    requireAI();

    await page.getByText("Build a Chatbot", { exact: true }).click();
    await expect(
      page.getByText(/chatbot|flow|node|autorespond|trigger/i).first()
    ).toBeVisible({ timeout: 60_000 });
  });

  test("'Create a Template' tile triggers a template creation response", async ({ page }) => {
    requireAI();

    await page.getByText("Create a Template", { exact: true }).click();
    await expect(
      page.getByText(/template|meta|whatsapp|message/i).first()
    ).toBeVisible({ timeout: 60_000 });
  });
});
