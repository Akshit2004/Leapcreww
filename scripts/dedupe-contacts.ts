/**
 * dedupe-contacts.ts — one-off data migration for Finding #10 (2.2).
 *
 * Before adding `@@unique([organizationId, email])` to Contact, collapse any
 * existing contacts that share an (organizationId, email) pair into a single
 * survivor, repointing all child rows. Idempotent: safe to run repeatedly
 * (a clean DB is a no-op).
 *
 * Run:  node --import dotenv/config scripts/dedupe-contacts.ts
 *       (add  --apply  to actually mutate; default is a dry run)
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const APPLY = process.argv.includes("--apply");

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log(`[dedupe] mode: ${APPLY ? "APPLY (will mutate)" : "DRY RUN"}`);

  // Find (organizationId, email) groups with more than one contact.
  const groups = await prisma.contact.groupBy({
    by: ["organizationId", "email"],
    _count: { _all: true },
    having: { email: { _count: { gt: 1 } } },
  });

  if (groups.length === 0) {
    console.log("[dedupe] No duplicate (organizationId, email) groups found. Nothing to do.");
    return;
  }

  console.log(`[dedupe] Found ${groups.length} duplicate group(s).`);
  let merged = 0;

  for (const g of groups) {
    const dupes = await prisma.contact.findMany({
      where: { organizationId: g.organizationId, email: g.email },
      orderBy: { updatedAt: "desc" }, // keep the most recently updated as survivor
      include: { cart: true },
    });
    const [survivor, ...losers] = dupes;
    console.log(
      `[dedupe] org=${g.organizationId} email=${g.email}: keeping ${survivor.id}, merging ${losers.length}`
    );

    if (!APPLY) {
      merged += losers.length;
      continue;
    }

    // Track the survivor's cart state across losers (Cart is 1:1 on contactId).
    let survivorHasCart = !!survivor.cart;

    for (const loser of losers) {
      await prisma.$transaction(async (tx) => {
        // Repoint the many-side children.
        await tx.message.updateMany({ where: { contactId: loser.id }, data: { contactId: survivor.id } });
        await tx.order.updateMany({ where: { contactId: loser.id }, data: { contactId: survivor.id } });
        await tx.sequenceEnrollment.updateMany({ where: { contactId: loser.id }, data: { contactId: survivor.id } });
        await tx.flowResponse.updateMany({ where: { contactId: loser.id }, data: { contactId: survivor.id } });
        await tx.attributionTouch.updateMany({ where: { contactId: loser.id }, data: { contactId: survivor.id } });

        // If the survivor already has a cart, drop the loser's; otherwise move it.
        if (loser.cart) {
          if (survivorHasCart) {
            await tx.cartItem.deleteMany({ where: { cartId: loser.cart.id } });
            await tx.cart.delete({ where: { id: loser.cart.id } });
          } else {
            await tx.cart.update({ where: { id: loser.cart.id }, data: { contactId: survivor.id } });
            survivorHasCart = true;
          }
        }

        await tx.contact.delete({ where: { id: loser.id } });
      });
      merged++;
    }
  }

  console.log(`[dedupe] ${APPLY ? "Merged" : "Would merge"} ${merged} duplicate contact(s).`);
}

main()
  .catch((e) => {
    console.error("[dedupe] FAILED:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
