const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Load .env configuration
const envPath = path.join(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const index = trimmed.indexOf("=");
      const key = trimmed.substring(0, index).trim();
      const val = trimmed.substring(index + 1).trim().replace(/^['"]|['"]$/g, "");
      process.env[key] = val;
    }
  }
}

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL or DIRECT_URL is not set.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  console.log("🚀 Starting Direct Integration Test for WhatsApp Cart Abandonment...");

  const orgId = "7aba66c7-773e-4403-ac39-dcb4e38b4a62"; // Flowcept org
  const testPhone = "+918894606932";
  const testSku = "SKU-SAREE-TEST";

  // 1. Clean up existing test data
  console.log("\n🧹 Cleaning up test data...");
  
  // Find contact ID if it exists
  const existingContact = await prisma.contact.findFirst({
    where: { phone: testPhone, organizationId: orgId }
  });

  if (existingContact) {
    console.log(`- Deleting existing contact ${existingContact.id}`);
    await prisma.sequenceEnrollment.deleteMany({ where: { contactId: existingContact.id } });
    await prisma.order.deleteMany({ where: { contactId: existingContact.id } });
    await prisma.message.deleteMany({ where: { contactId: existingContact.id } });
    await prisma.contact.delete({ where: { id: existingContact.id } });
  }

  // Delete test product
  await prisma.product.deleteMany({
    where: { sku: testSku, organizationId: orgId }
  });

  // Delete sequence for test
  await prisma.sequence.deleteMany({
    where: { trigger: "cart_abandoned", organizationId: orgId, name: "Test Abandoned Cart Drip" }
  });

  // 2. Setup Test Data
  console.log("\n📦 Setting up test product and sequence...");
  const product = await prisma.product.create({
    data: {
      name: "Super Saree",
      sku: testSku,
      price: 150000, // ₹1500.00
      stock: 10,
      category: "Test",
      images: ["https://images.unsplash.com/photo-1472851294608-062f824d29cc"],
      description: "A super test saree",
      organizationId: orgId
    }
  });
  console.log(`- Created product: ${product.name} (SKU: ${product.sku}, ID: ${product.id})`);

  // Create Sequence for cart_abandoned
  const sequence = await prisma.sequence.create({
    data: {
      name: "Test Abandoned Cart Drip",
      trigger: "cart_abandoned",
      status: "active",
      organizationId: orgId,
      steps: {
        create: [
          {
            order: 0,
            delayMinutes: 0,
            actionType: "send_template",
            templateName: "cart_recovery",
            message: "Hello {{contact.name}}, you left items in your cart. Buy now at {{cart.checkout_url}}"
          }
        ]
      }
    },
    include: { steps: true }
  });
  console.log(`- Created sequence: ${sequence.name} (ID: ${sequence.id}, Steps: ${sequence.steps.length})`);

  // 3. Simulate WhatsApp Inbound Native Order (Marketplace Cart) via Webhook POST Handler
  console.log("\n💬 Simulating WhatsApp Webhook Inbound Order...");
  
  const webhookPayload = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "1626500191974104",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "918796916888",
                phone_number_id: "1060212173852127"
              },
              contacts: [
                {
                  profile: {
                    name: "Test Akshit"
                  },
                  wa_id: testPhone.replace("+", "")
                }
              ],
              messages: [
                {
                  from: testPhone.replace("+", ""),
                  id: `wamid.TEST_MSG_${Date.now()}`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: "order",
                  order: {
                    catalog_id: "catalog123",
                    product_items: [
                      {
                        product_retailer_id: testSku,
                        quantity: "1",
                        item_price: "1500.00",
                        currency: "INR"
                      }
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    ]
  };

  const { POST: whatsappPost } = require("../src/features/webhooks/api/whatsapp/route");
  const { NextRequest } = require("next/server");
  
  const req = new NextRequest("http://localhost:3000/api/webhooks/whatsapp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(webhookPayload)
  });

  const response = await whatsappPost(req);
  if (response.status !== 200) {
    const errorBody = await response.json();
    console.error(`- Webhook simulation failed with status ${response.status}:`, errorBody);
    process.exit(1);
  }
  console.log(`- Inbound Order webhook processed: ${response.status}`);

  // 4. Verify Contact Tagged and Order Created
  console.log("\n🔍 Verifying Database records for Contact and Order...");
  const contact = await prisma.contact.findFirst({
    where: { phone: testPhone, organizationId: orgId }
  });

  if (!contact) {
    console.error("- Error: Contact not created in DB!");
    process.exit(1);
  }

  console.log(`- Contact found: ID ${contact.id}, Name: ${contact.name}`);
  console.log(`  Tags: ${JSON.stringify(contact.tags)} (Expected to contain "WhatsApp-Cart")`);
  console.log(`  Attributes: ${JSON.stringify(contact.attributes)}`);

  if (!contact.tags.includes("WhatsApp-Cart")) {
    console.error("- Error: Contact is missing 'WhatsApp-Cart' tag!");
    process.exit(1);
  }

  const attrs = contact.attributes || {};
  if (attrs.cart_recovered !== false || attrs.cart_recovery_enrolled !== false) {
    console.error("- Error: Contact attributes for cart tracking not initialized correctly!");
    process.exit(1);
  }
  console.log(`- Contact tags and attributes are CORRECT!`);

  // Verify Order
  const order = await prisma.order.findFirst({
    where: { contactId: contact.id, status: "pending" },
    include: { items: true }
  });

  if (!order) {
    console.error("- Error: Pending Order not created for the contact!");
    process.exit(1);
  }

  console.log(`- Order found: ID ${order.id}, OrderID: ${order.orderId}, Status: ${order.status}, Payment Status: ${order.paymentStatus}`);
  console.log(`  Razorpay Order ID: ${order.razorpayOrderId}`);
  console.log(`  Items count: ${order.items.length}`);
  
  if (order.items[0]?.name !== "Super Saree") {
    console.error("- Error: Order items not matched correctly!");
    process.exit(1);
  }
  console.log(`- Order created CORRECTLY!`);

  // 5. Trigger Cron sweep to Enroll Contact
  console.log("\n⏰ Triggering Drip Sequence Sweep and Cron...");
  // Import sweepAbandonedCarts directly from the sequence service
  const { sweepAbandonedCarts } = require("../src/features/sequences/services/sequenceService");
  
  // Running with threshold 0 minutes so our newly created cart/order is captured immediately
  const sweepResult = await sweepAbandonedCarts(0);
  console.log("- Sweep completed. Results:", sweepResult);

  // 6. Verify Enrollment exists
  const enrollment = await prisma.sequenceEnrollment.findFirst({
    where: { contactId: contact.id, status: "active" }
  });

  if (!enrollment) {
    console.error("- Error: SequenceEnrollment not created!");
    process.exit(1);
  }
  console.log(`- Sequence Enrollment verified successfully! Status: ${enrollment.status}`);

  // 7. Simulate Razorpay webhook payment capture directly
  console.log("\n💳 Simulating successful payment via Razorpay Webhook POST Handler...");
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "whsec_wappflow_marketplace_2026";
  const { POST: razorpayPost } = require("../src/features/webhooks/api/razorpay/route");

  const paymentPayload = {
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: `pay_TEST_${Date.now()}`,
          order_id: order.razorpayOrderId,
          amount: 150000,
          currency: "INR",
          status: "captured"
        }
      }
    }
  };

  const bodyText = JSON.stringify(paymentPayload);
  const signature = crypto
    .createHmac("sha256", webhookSecret)
    .update(bodyText)
    .digest("hex");

  const rzReq = new NextRequest("http://localhost:3000/api/webhooks/razorpay", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-razorpay-signature": signature
    },
    body: bodyText
  });

  const payResponse = await razorpayPost(rzReq);
  if (payResponse.status !== 200) {
    const payErrorBody = await payResponse.json();
    console.error(`- Razorpay webhook simulation failed with status ${payResponse.status}:`, payErrorBody);
    process.exit(1);
  }
  console.log(`- Razorpay Webhook processed: ${payResponse.status}`);

  // 8. Verify Cart Recovered and Enrollment completed
  console.log("\n🔍 Verifying Post-Payment Database Status...");
  const updatedContact = await prisma.contact.findFirst({
    where: { id: contact.id }
  });

  const updatedAttrs = updatedContact.attributes || {};
  console.log(`- Updated Contact Attributes: ${JSON.stringify(updatedAttrs)}`);
  
  if (updatedAttrs.cart_recovered !== true) {
    console.error("- Error: cart_recovered is NOT true on contact!");
    process.exit(1);
  }
  console.log("- Contact cart_recovered is CORRECT (true)!");

  const updatedEnrollment = await prisma.sequenceEnrollment.findFirst({
    where: { id: enrollment.id }
  });

  console.log(`- Updated Enrollment Status: ${updatedEnrollment.status}, nextRunAt: ${updatedEnrollment.nextRunAt}`);
  if (updatedEnrollment.status !== "completed") {
    console.error("- Error: Sequence Enrollment status is NOT 'completed'!");
    process.exit(1);
  }
  console.log("- Sequence Enrollment is CORRECT (completed)!");

  const updatedOrder = await prisma.order.findUnique({
    where: { id: order.id }
  });
  console.log(`- Updated Order Status: ${updatedOrder.status}, Payment Status: ${updatedOrder.paymentStatus}`);
  if (updatedOrder.paymentStatus !== "paid") {
    console.error("- Error: Order payment status is NOT 'paid'!");
    process.exit(1);
  }
  console.log("- Order status is CORRECT (paid)!");

  console.log("\n🎉 ALL TESTS PASSED! WhatsApp Marketplace Cart Abandonment recovery works end-to-end flawlessly!");
}

run().catch(err => {
  console.error("Test execution failed:", err);
}).finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
