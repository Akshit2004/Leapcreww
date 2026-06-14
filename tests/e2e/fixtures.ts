import { test as base, expect, type Page } from "@playwright/test";

type Fixtures = {
  orgId: string;
  /** Navigate to a dashboard tab: gotoTab(page, "campaigns") -> /org/{orgId}?tab=campaigns */
  gotoTab: (tab: string) => Promise<void>;
};

export const test = base.extend<Fixtures>({
  orgId: async ({ page }, use) => {
    let orgId = process.env.E2E_ORG_ID;
    if (!orgId) {
      await page.goto("/");
      await page.waitForURL(/\/org\/[^/?]+/, { timeout: 30_000 });
      const match = page.url().match(/\/org\/([^/?]+)/);
      orgId = match?.[1];
    }
    if (!orgId) throw new Error("Could not resolve orgId. Set E2E_ORG_ID in .env.test.");
    await use(orgId);
  },

  gotoTab: async ({ page, orgId }, use) => {
    await use(async (tab: string) => {
      await page.goto(`/org/${orgId}?tab=${tab}`);
      await page.waitForURL(new RegExp(`tab=${tab}`));
    });
  },
});

export { expect };

/** Skip a test unless E2E_RUN_AI=1 (Groq-backed features: slow + non-deterministic). */
export function requireAI() {
  test.skip(!process.env.E2E_RUN_AI, "Set E2E_RUN_AI=1 to run Groq-backed AI tests");
}

/** Skip a test unless a WhatsApp-connected test number is configured. */
export function requireWhatsApp() {
  test.skip(!process.env.E2E_WHATSAPP_TEST_NUMBER, "Set E2E_WHATSAPP_TEST_NUMBER for live WhatsApp tests");
}

/** Close any open modal/dialog by pressing Escape, ignoring errors if none open. */
export async function closeModal(page: Page) {
  await page.keyboard.press("Escape").catch(() => {});
}
