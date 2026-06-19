// Captures real app screenshots for the promo video.
// Usage: node scripts/capture.mjs   (run from video_promo/, dev server on :3000)
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../public/app");
fs.mkdirSync(OUT, { recursive: true });

const BASE = process.env.E2E_BASE_URL || "http://localhost:3000";
const EMAIL = process.env.E2E_TEST_EMAIL || "akshumahajan2004@gmail.com";
const PASSWORD = process.env.E2E_TEST_PASSWORD || "password123";
const ORG = process.env.E2E_ORG_ID || "7aba66c7-773e-4403-ac39-dcb4e38b4a62";

// Desktop tabs to capture (key, settle-ms)
const TABS = [
  ["overview", 2500],
  ["campaigns", 2500],
  ["chatbot", 3500],
  ["flows", 3500],
  ["analytics", 3000],
  ["templates", 2500],
  ["customers", 2500],
  ["inbox", 2500],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

console.log("→ logging in…");
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.getByPlaceholder("you@example.com").fill(EMAIL);
await page.getByPlaceholder("••••••••").fill(PASSWORD);
await page.getByRole("button", { name: /sign in/i }).click();
await page.waitForURL(/\/org\/.+/, { timeout: 30000 });
console.log("✓ logged in:", page.url());

async function hideCopilot(p) {
  // Hide the floating AI Copilot FAB so it doesn't cover the corner in shots.
  await p.addStyleTag({ content: `[class*="fixed"][class*="bottom"] button, button:has-text("AI Copilot") { }` }).catch(() => {});
  await p.evaluate(() => {
    for (const el of Array.from(document.querySelectorAll("button, div"))) {
      if (el.textContent && el.textContent.trim() === "AI Copilot") {
        let n = el; for (let i = 0; i < 4 && n; i++) { if (getComputedStyle(n).position === "fixed") { n.style.display = "none"; break; } n = n.parentElement; }
      }
    }
  }).catch(() => {});
}

for (const [tab, settle] of TABS) {
  try {
    await page.goto(`${BASE}/org/${ORG}?tab=${tab}`, { waitUntil: "networkidle" });
    await sleep(settle);
    // Chatbot: trigger auto-layout so seeded nodes arrange on the canvas.
    if (tab === "chatbot") {
      await page.getByRole("button", { name: /auto.?arrange/i }).click().catch(() => {});
      await sleep(1500);
    }
    await hideCopilot(page);
    await sleep(400);
    const file = path.join(OUT, `${tab}.png`);
    await page.screenshot({ path: file });
    console.log("✓ captured", tab, "→", file);
  } catch (e) {
    console.warn("✗ failed", tab, e.message);
  }
}

// Mobile capture of chatbot + overview (for phone-frame composites)
const mctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  storageState: await ctx.storageState(),
});
const mpage = await mctx.newPage();
for (const tab of ["overview", "campaigns", "inbox"]) {
  try {
    await mpage.goto(`${BASE}/org/${ORG}?tab=${tab}`, { waitUntil: "networkidle" });
    await sleep(2500);
    const file = path.join(OUT, `mobile-${tab}.png`);
    await mpage.screenshot({ path: file });
    console.log("✓ captured mobile", tab);
  } catch (e) {
    console.warn("✗ failed mobile", tab, e.message);
  }
}

await browser.close();
console.log("done");
