// Seeds realistic demo data scoped to ONE org for promo screenshots.
// Records every created row id to seed-ids.json so cleanup-demo.mjs can delete
// exactly what was created (no blanket deletes against the live DB).
//
// Usage: node video_promo/scripts/seed-demo.mjs
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import dotenv from "dotenv";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const ORG = process.env.E2E_ORG_ID || "7aba66c7-773e-4403-ac39-dcb4e38b4a62";
const IDS_FILE = path.resolve(__dirname, "seed-ids.json");

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const created = { contacts: [], campaigns: [], templates: [], nodes: [] };

// ── Contacts (D2C skincare brand "Aura") ───────────────────────────────────
const FIRST = ["Priya", "Rohan", "Ananya", "Vikram", "Sneha", "Arjun", "Kavya", "Aditya", "Meera", "Karan", "Diya", "Rahul", "Isha", "Nikhil", "Tara", "Sahil", "Riya", "Dev", "Pooja", "Aman"];
const LAST = ["Sharma", "Mehta", "Iyer", "Kapoor", "Reddy", "Nair", "Singh", "Bose", "Patel", "Gupta"];
const TAGS = ["vip", "abandoned-cart", "new-lead", "repeat-buyer", "newsletter", "skincare", "high-intent"];
const SOURCES = ["WhatsApp", "Shopify", "Ad Click", "Website Widget"];

function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function sample(a, n) { return [...a].sort(() => 0.5 - Math.random()).slice(0, n); }

async function seedContacts() {
  for (let i = 0; i < 34; i++) {
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    const phone = "+9198" + String(Math.floor(10000000 + Math.random() * 89999999));
    const id = randomUUID();
    try {
      await prisma.contact.create({
        data: {
          id, name, phone,
          email: name.toLowerCase().replace(/\s+/g, ".") + "@gmail.com",
          source: pick(SOURCES),
          tags: sample(TAGS, 1 + Math.floor(Math.random() * 3)),
          status: Math.random() > 0.2 ? "Active" : "Inactive",
          lastMessage: pick(["Thanks! 🙌", "Is this in stock?", "Order placed ✅", "Can I get a discount?", "Loved the serum!"]),
          lastMessageTime: new Date(Date.now() - Math.random() * 6e8).toISOString(),
          assignedAgent: "None",
          organizationId: ORG,
        },
      });
      created.contacts.push(id);
    } catch (e) { /* skip unique phone collisions */ }
  }
  console.log(`✓ contacts: ${created.contacts.length}`);
}

// ── Campaigns (realistic delivery funnel) ──────────────────────────────────
async function seedCampaigns() {
  const defs = [
    { name: "Diwali Mega Sale 🪔", tag: "newsletter", tmpl: "diwali_sale", sent: 4820, dr: 0.97, rr: 0.71, cr: 0.34, status: "Completed", days: 3 },
    { name: "Abandoned Cart Recovery", tag: "abandoned-cart", tmpl: "cart_recovery", sent: 1240, dr: 0.95, rr: 0.68, cr: 0.41, status: "Completed", days: 1 },
    { name: "New Vitamin C Serum Launch", tag: "skincare", tmpl: "product_launch", sent: 3110, dr: 0.96, rr: 0.64, cr: 0.29, status: "Completed", days: 5 },
    { name: "VIP Early Access Drop", tag: "vip", tmpl: "vip_access", sent: 612, dr: 0.98, rr: 0.82, cr: 0.55, status: "Completed", days: 7 },
    { name: "Weekend Flash Sale", tag: "high-intent", tmpl: "flash_sale", sent: 2890, dr: 0.94, rr: 0.6, cr: 0.31, status: "Sending", days: 0, partial: 0.46 },
    { name: "Win-Back: We Miss You 💚", tag: "repeat-buyer", tmpl: "winback", sent: 0, dr: 0, rr: 0, cr: 0, status: "Scheduled", days: -2 },
    { name: "Restock Alert: Best Sellers", tag: "newsletter", tmpl: "restock", sent: 1760, dr: 0.96, rr: 0.66, cr: 0.27, status: "Completed", days: 9 },
  ];
  for (const d of defs) {
    const id = randomUUID();
    const mult = d.partial ?? 1;
    const sent = Math.round(d.sent * mult);
    const delivered = Math.round(sent * d.dr);
    const read = Math.round(sent * d.rr);
    const clicked = Math.round(sent * d.cr);
    const date = new Date(Date.now() - d.days * 864e5).toISOString();
    await prisma.campaign.create({
      data: {
        id, name: d.name, targetTag: d.tag, templateName: d.tmpl,
        sent, delivered, read, clicked, status: d.status, date,
        scheduledAt: d.status === "Scheduled" ? new Date(Date.now() + 2 * 864e5) : null,
        mediaType: "image", delay: 1, organizationId: ORG,
      },
    });
    created.campaigns.push(id);
  }
  console.log(`✓ campaigns: ${created.campaigns.length}`);
}

// ── Templates ──────────────────────────────────────────────────────────────
async function seedTemplates() {
  const defs = [
    { name: "diwali_sale", category: "Marketing", body: "🪔 Happy Diwali, {{1}}! Celebrate with 40% OFF everything. Use code DIWALI40. Shop now before midnight!", buttons: ["Shop Now", "View Offers"], status: "approved" },
    { name: "cart_recovery", category: "Marketing", body: "Hi {{1}}, you left something in your cart 🛒 Complete your order in the next 30 mins and get free shipping!", buttons: ["Complete Order"], status: "approved" },
    { name: "product_launch", category: "Marketing", body: "✨ Just dropped: our new Vitamin C Serum. Brighter skin in 2 weeks, {{1}}. Be the first to try it.", buttons: ["Shop the Drop"], status: "approved" },
    { name: "order_confirmation", category: "Utility", body: "Thanks {{1}}! Your order #{{2}} is confirmed and will ship within 24 hours. Track it anytime here.", buttons: ["Track Order"], status: "approved" },
    { name: "vip_access", category: "Marketing", body: "You're on the list, {{1}} 💚 VIP early access opens now — 1 hour before everyone else.", buttons: ["Unlock Access"], status: "pending" },
    { name: "winback", category: "Marketing", body: "We miss you, {{1}}! Here's 20% off your next order to welcome you back. Code: COMEBACK20", buttons: ["Redeem Offer"], status: "approved" },
  ];
  for (const d of defs) {
    const id = randomUUID();
    await prisma.template.create({
      data: {
        id, name: d.name, body: d.body, category: d.category,
        buttons: d.buttons, mediaType: "none", metaStatus: d.status,
        organizationId: ORG,
      },
    });
    created.templates.push(id);
  }
  console.log(`✓ templates: ${created.templates.length}`);
}

// ── Chatbot flow (branching tree, auto-laid-out by builder) ────────────────
async function seedNodes() {
  const nodes = [
    { id: "n1", type: "trigger", title: "Conversation Started", content: "When a customer messages your WhatsApp number", options: [], nextId: "n2", routes: null },
    { id: "n2", type: "message", title: "Welcome", content: "Hey there 👋 Welcome to Aura Skincare! How can we help you glow today?", options: [], nextId: "n3", routes: null },
    { id: "n3", type: "question", title: "Main Menu", content: "What are you looking for?", options: ["Shop Products", "Track My Order", "Talk to a Human"], nextId: null, routes: { "Shop Products": "n4", "Track My Order": "n5", "Talk to a Human": "n6" } },
    { id: "n4", type: "message", title: "Browse Catalog", content: "Here's our bestselling range 🛍️ Tap any product to add it to your cart.", options: [], nextId: "n7", routes: null },
    { id: "n5", type: "question", title: "Order Lookup", content: "Sure! Please share your order ID and I'll fetch the latest status.", options: [], nextId: null, routes: null },
    { id: "n6", type: "delay", title: "Routing to Agent", content: "Hold on, connecting you to a skincare expert…", options: [], delayTime: 3, nextId: "n8", routes: null },
    { id: "n7", type: "question", title: "Skin Type", content: "Quick question — what's your skin type?", options: ["Oily", "Dry", "Combination"], nextId: null, routes: {} },
    { id: "n8", type: "message", title: "Agent Connected", content: "You're now chatting with Meera from our team 💚", options: [], nextId: null, routes: null },
  ];
  for (const n of nodes) {
    await prisma.chatbotNode.create({
      data: {
        id: n.id, type: n.type, title: n.title, content: n.content,
        options: n.options, delayTime: n.delayTime ?? null,
        nextId: n.nextId, routes: n.routes ?? undefined,
        organizationId: ORG,
      },
    });
    created.nodes.push(n.id);
  }
  console.log(`✓ chatbot nodes: ${created.nodes.length}`);
}

await seedContacts();
await seedCampaigns();
await seedTemplates();
await seedNodes();

fs.writeFileSync(IDS_FILE, JSON.stringify({ org: ORG, ...created }, null, 2));
console.log("✓ recorded ids →", IDS_FILE);
await prisma.$disconnect();
await pool.end();
