// Deletes exactly the demo rows recorded in seed-ids.json. Scoped by id + org.
// Usage: node video_promo/scripts/cleanup-demo.mjs
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const IDS_FILE = path.resolve(__dirname, "seed-ids.json");
if (!fs.existsSync(IDS_FILE)) {
  console.error("No seed-ids.json found — nothing to clean up.");
  process.exit(1);
}
const { org, contacts = [], campaigns = [], templates = [], nodes = [] } = JSON.parse(fs.readFileSync(IDS_FILE, "utf8"));

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const c1 = await prisma.campaign.deleteMany({ where: { organizationId: org, id: { in: campaigns } } });
const t1 = await prisma.template.deleteMany({ where: { organizationId: org, id: { in: templates } } });
const n1 = await prisma.chatbotNode.deleteMany({ where: { organizationId: org, id: { in: nodes } } });
const ct1 = await prisma.contact.deleteMany({ where: { organizationId: org, id: { in: contacts } } });

console.log(`✓ deleted campaigns=${c1.count} templates=${t1.count} nodes=${n1.count} contacts=${ct1.count}`);
fs.renameSync(IDS_FILE, IDS_FILE + ".done");
await prisma.$disconnect();
await pool.end();
