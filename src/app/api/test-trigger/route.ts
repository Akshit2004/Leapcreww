import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/lib/prisma";
import { handleShopifyEvent } from "@/features/webhooks/services/shopifyWebhookService";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "cart" or "rto"
    const phone = searchParams.get("phone") || "+919999988888";
    const shop = searchParams.get("shop") || "smritix-test.myshopify.com";

    if (!type || (type !== "cart" && type !== "rto")) {
      return NextResponse.json({
        error: "Missing or invalid 'type' parameter. Use '?type=cart' or '?type=rto'. You can also pass '&phone=+91xxxxxxxxx' to use your own phone number."
      }, { status: 400 });
    }

    // 1. Find or create the first organization in the database
    let org = await prisma.organization.findFirst();
    if (!org) {
      org = await prisma.organization.create({
        data: {
          name: "Test Org",
          slug: "test-org",
          whatsappConnected: true,
          whatsappPhoneNumberId: "1234567890",
          whatsappBusinessAccountId: "0987654321",
          activeUseCase: "ECOMMERCE",
          businessVertical: "ECOMMERCE",
          fulfillmentHoldEnabled: true,
        }
      });
    }

    // 2. Ensure Shopify Integration row exists for the org
    let integration = await prisma.integration.findUnique({
      where: { id_organizationId: { id: "shopify", organizationId: org.id } }
    });

    if (!integration) {
      integration = await prisma.integration.create({
        data: {
          id: "shopify",
          name: "Shopify",
          description: "Shopify integration details",
          icon: "shopify",
          organizationId: org.id,
          status: "connected",
          webhookUrl: `https://${shop}`,
          apiKey: JSON.stringify({ shopDomain: shop, accessToken: "mock-token" })
        }
      });
    } else {
      // Ensure the webhook URL matches the shop we are testing
      await prisma.integration.update({
        where: { id_organizationId: { id: "shopify", organizationId: org.id } },
        data: { webhookUrl: `https://${shop}`, status: "connected" }
      });
    }

    // 3. Seed necessary approved templates so drips don't crash
    const templatesToSeed = [
      { name: "cod_risk_verify", body: "Hi {{1}}, please reply YES to verify your order #{{2}} of {{3}} or NO to cancel." },
      { name: "cod_confirmation", body: "Hi {{1}}, your order #{{2}} of {{3}} has been confirmed! 🚚" },
      { name: "cr_t1_new", body: "Hi {{1}}, we noticed you left items in your cart. Checkout here: {{3}}" },
      { name: "cr_t1_generic", body: "Hi {{1}}, did you forget something? Checkout here: {{3}}" }
    ];

    for (const t of templatesToSeed) {
      const existing = await prisma.template.findFirst({
        where: { name: t.name, organizationId: org.id }
      });
      if (!existing) {
        await prisma.template.create({
          data: {
            name: t.name,
            body: t.body,
            category: "Utility",
            metaStatus: "approved", // Must be approved to trigger drips
            organizationId: org.id
          }
        });
      } else if (existing.metaStatus !== "approved") {
        await prisma.template.update({
          where: { id: existing.id },
          data: { metaStatus: "approved" }
        });
      }
    }

    // 4. Seed active Sequences for triggers
    const triggerType = type === "cart" ? "cart_abandoned" : "cod_order_placed";
    const seqName = type === "cart" ? "Cart Recovery Sequence" : "COD Verification Sequence";
    const stepTemplate = type === "cart" ? "cr_t1_new" : "cod_risk_verify";

    let seq = await prisma.sequence.findFirst({
      where: { trigger: triggerType, organizationId: org.id, status: "active" }
    });

    if (!seq) {
      seq = await prisma.sequence.create({
        data: {
          name: seqName,
          trigger: triggerType,
          status: "active",
          organizationId: org.id,
          steps: {
            create: [
              {
                order: 0,
                delayMinutes: 0, // Run immediately for test validation
                actionType: "send_template",
                templateName: stepTemplate,
                message: "Test step message"
              }
            ]
          }
        }
      });
    }

    // 5. Dispatch the fake webhook payload to handleShopifyEvent
    if (type === "cart") {
      const payload = {
        id: "test-checkout-123",
        email: "test-customer@example.com",
        customer: {
          first_name: "John",
          last_name: "Doe",
          phone: phone
        },
        billing_address: { phone: phone },
        shipping_address: { phone: phone },
        line_items: [
          { title: "Sample Premium Item", price: "3500.00", quantity: 1 }
        ],
        total_price: "3500.00",
        abandoned_checkout_url: `https://${shop}/12345/checkouts/ac`
      };

      const result = await handleShopifyEvent("checkouts/create", payload, org.id, shop);
      return NextResponse.json({
        success: true,
        message: `Simulated checkouts/create (Cart Recovery) webhook successfully for number ${phone}!`,
        organizationId: org.id,
        result
      });
    } else {
      // Simulated orders/create (High-Risk COD Order)
      const payload = {
        id: "test-order-987",
        financial_status: "pending", // COD order starts as pending
        email: "test-customer@example.com",
        customer: {
          first_name: "John",
          last_name: "Doe",
          phone: phone
        },
        billing_address: { phone: phone },
        shipping_address: { phone: phone },
        line_items: [
          { title: "Sample COD Item 1", price: "3500.00", quantity: 1 },
          { title: "Sample COD Item 2", price: "2000.00", quantity: 1 }
        ],
        total_price: "5500.00", // Total price > 3000 -> scores high risk
        order_number: 1234
      };

      const result = await handleShopifyEvent("orders/create", payload, org.id, shop);
      return NextResponse.json({
        success: true,
        message: `Simulated orders/create (RTO Agent) COD webhook successfully for number ${phone}!`,
        organizationId: org.id,
        result
      });
    }

  } catch (err: any) {
    console.error("❌ Test trigger route failed:", err);
    return NextResponse.json({
      success: false,
      error: err.message || "Internal server error"
    }, { status: 500 });
  }
}
