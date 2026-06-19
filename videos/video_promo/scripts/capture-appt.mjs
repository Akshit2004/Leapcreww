// Captures the real Appointment Console (Slots + Bookings views) for the promo.
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../public/app");
fs.mkdirSync(OUT, { recursive: true });

const BASE = "http://localhost:3000";
const EMAIL = "akshumahajan2004@gmail.com";
const PASSWORD = "password123";
const ORG = "7aba66c7-773e-4403-ac39-dcb4e38b4a62";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.getByPlaceholder("you@example.com").fill(EMAIL);
await page.getByPlaceholder("••••••••").fill(PASSWORD);
await page.getByRole("button", { name: /sign in/i }).click();
await page.waitForURL(/\/org\/.+/, { timeout: 30000 });
console.log("✓ logged in");

async function hideCopilot(p) {
  await p.evaluate(() => {
    for (const el of Array.from(document.querySelectorAll("button, div"))) {
      if (el.textContent && el.textContent.trim() === "AI Copilot") {
        let n = el; for (let i = 0; i < 4 && n; i++) { if (getComputedStyle(n).position === "fixed") { n.style.display = "none"; break; } n = n.parentElement; }
      }
    }
  }).catch(() => {});
}
function scroller() {
  return document.querySelector(".custom-scrollbar.overflow-y-auto") || document.querySelector("[class*='overflow-y-auto']");
}

await page.goto(`${BASE}/org/${ORG}?tab=usecases`, { waitUntil: "networkidle" });
await sleep(3500);
await hideCopilot(page);

// Slots view — scroll so stats + view tabs + slot list are framed
await page.evaluate(() => { const s = (document.querySelector(".custom-scrollbar.overflow-y-auto") || document.querySelector("[class*='overflow-y-auto']")); if (s) s.scrollTop = 360; });
await sleep(900);
await page.screenshot({ path: path.join(OUT, "appt-slots.png") });
console.log("✓ captured appt-slots");

// Bookings view
await page.getByRole("button", { name: /^Bookings$/ }).click().catch(async () => {
  await page.getByText("Bookings", { exact: true }).first().click().catch(() => {});
});
await sleep(1800);
await hideCopilot(page);
await page.evaluate(() => { const s = (document.querySelector(".custom-scrollbar.overflow-y-auto") || document.querySelector("[class*='overflow-y-auto']")); if (s) s.scrollTop = 360; });
await sleep(800);
await page.screenshot({ path: path.join(OUT, "appt-bookings.png") });
console.log("✓ captured appt-bookings");

// Also a top-of-console shot (agent active + preset + stats)
await page.evaluate(() => { const s = (document.querySelector(".custom-scrollbar.overflow-y-auto") || document.querySelector("[class*='overflow-y-auto']")); if (s) s.scrollTop = 0; });
await page.getByRole("button", { name: /^Slots$/ }).click().catch(() => {});
await sleep(900);
await hideCopilot(page);
await page.screenshot({ path: path.join(OUT, "appt-console-top.png") });
console.log("✓ captured appt-console-top");

await browser.close();
console.log("done");
