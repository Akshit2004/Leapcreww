import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/features/auth/api/[...nextauth]/route";
import { prisma } from "@/shared/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { orgId } = await params;
    interface CustomSessionUser { id: string }
    const userId = (session.user as unknown as CustomSessionUser).id;

    // Verify tenancy membership
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: orgId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden: Access to workspace is denied." }, { status: 403 });
    }

    const integrations = await prisma.integration.findMany({
      where: {
        organizationId: orgId,
      },
    });

    // For backwards compatibility, still return the first shopify integration if present
    const integration = integrations.find(i => i.id === "shopify") || null;

    return NextResponse.json({ integrations, integration });
  } catch (err: unknown) {
    console.error("❌ GET integration api error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { orgId } = await params;
    interface CustomSessionUser { id: string }
    const userId = (session.user as unknown as CustomSessionUser).id;

    // Verify tenancy membership
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: orgId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden: Access to workspace is denied." }, { status: 403 });
    }

    const body = await request.json();
    const { action, integrationId, shopDomain, accessToken, keyId, keySecret, webhookSecret } = body;

    const resolvedIntegrationId = integrationId || (shopDomain ? "shopify" : "razorpay");

    // A. Handle Disconnect Action
    if (action === "disconnect") {
      const existing = await prisma.integration.findUnique({
        where: {
          id_organizationId: {
            id: resolvedIntegrationId,
            organizationId: orgId,
          },
        },
      });

      if (!existing) {
        return NextResponse.json({ error: "Integration not found." }, { status: 404 });
      }

      await prisma.integration.delete({
        where: {
          id_organizationId: {
            id: resolvedIntegrationId,
            organizationId: orgId,
          },
        },
      });

      // Create disconnect log
      await prisma.systemLog.create({
        data: {
          type: "integration",
          message: `${resolvedIntegrationId} Integration successfully disconnected.`,
          organizationId: orgId,
        },
      });

      return NextResponse.json({ success: true });
    }

    if (resolvedIntegrationId === "razorpay") {
      if (!keyId || !keySecret) {
        return NextResponse.json({ error: "Key ID and Key Secret are required." }, { status: 400 });
      }

      const integrationData = {
        name: "Razorpay",
        description: "Receive payments directly to your Razorpay account.",
        status: "connected",
        icon: "CreditCard",
        apiKey: JSON.stringify({ keyId, keySecret, webhookSecret: webhookSecret || "" }),
      };

      await prisma.integration.upsert({
        where: {
          id_organizationId: {
            id: "razorpay",
            organizationId: orgId,
          },
        },
        update: integrationData,
        create: {
          id: "razorpay",
          organizationId: orgId,
          ...integrationData,
        },
      });

      await prisma.systemLog.create({
        data: {
          type: "integration",
          message: `Razorpay Connected via manual keys.`,
          organizationId: orgId,
        },
      });

      return NextResponse.json({ success: true });
    }

    // B. Handle Manual Credentials Connection (Developer Mode) - SHOPIFY
    if (!shopDomain || !accessToken) {
      return NextResponse.json({ error: "Shop domain and access token are required." }, { status: 400 });
    }

    // Sanitize shop domain
    let cleanShop = shopDomain.replace(/^https?:\/\//, "").trim();
    if (!cleanShop.includes(".")) {
      cleanShop = `${cleanShop}.myshopify.com`;
    }

    // Validate connection credentials by querying Shopify
    const shopApiUrl = `https://${cleanShop}/admin/api/2024-04/shop.json`;
    let shopName = cleanShop.split(".")[0];
    
    try {
      const shopResponse = await fetch(shopApiUrl, {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      });

      if (!shopResponse.ok) {
        return NextResponse.json(
          { error: "Failed to connect to Shopify. Please verify your shop domain and access token are correct." },
          { status: 400 }
        );
      }

      const shopData = await shopResponse.json();
      shopName = shopData.shop?.name || shopName;
    } catch (e: unknown) {
      return NextResponse.json(
        { error: `Connection timeout or DNS failure. Details: ${e instanceof Error ? e.message : String(e)}` },
        { status: 500 }
      );
    }

    // Upsert integration
    const serializedApiKey = JSON.stringify({
      shopDomain: cleanShop,
      accessToken,
    });

    const integrationData = {
      name: "Shopify",
      description: "Sync products, track orders, recover carts, and automate post-purchase flows.",
      status: "connected",
      icon: "ShoppingBag",
      apiKey: serializedApiKey,
      webhookUrl: `https://${cleanShop}`,
    };

    await prisma.integration.upsert({
      where: {
        id_organizationId: {
          id: "shopify",
          organizationId: orgId,
        },
      },
      update: integrationData,
      create: {
        id: "shopify",
        organizationId: orgId,
        ...integrationData,
      },
    });

    // Programmatically Register Webhooks for Custom App Connection (if non-localhost)
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
    const protocol = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const origin = `${protocol}://${host}`;
    const webhookReceiverUrl = `${origin}/api/webhooks/shopify`;

    const webhooksRegistered: string[] = [];
    let webhookWarning = "";

    const isLocal = host.includes("localhost") || host.includes("127.0.0.1");

    if (isLocal) {
      webhookWarning = "Localhost environment detected. Skipping automatic Shopify webhook registration. Please set up a tunnel (e.g. ngrok) to receive real-time webhook updates.";
    } else {
      const topics = ["orders/create", "orders/fulfilled", "checkouts/create"];
      for (const topic of topics) {
        try {
          const webhookRes = await fetch(`https://${cleanShop}/admin/api/2024-04/webhooks.json`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Access-Token": accessToken,
            },
            body: JSON.stringify({
              webhook: {
                topic,
                address: webhookReceiverUrl,
                format: "json",
              },
            }),
          });
          if (webhookRes.ok) {
            webhooksRegistered.push(topic);
          }
        } catch (e) {
          console.error(`❌ Webhook subscription failed for ${topic}:`, e);
        }
      }
    }

    // Save System Log
    await prisma.systemLog.create({
      data: {
        type: "integration",
        message: `Shopify Connected: Store "${shopName}" (${cleanShop}) connected manually via Developer Mode token.${
          webhooksRegistered.length > 0
            ? ` Registered webhook topics: ${webhooksRegistered.join(", ")}.`
            : ""
        }`,
        organizationId: orgId,
      },
    });

    return NextResponse.json({
      success: true,
      shopName,
      shopDomain: cleanShop,
      webhooksRegistered,
      webhookWarning,
    });
  } catch (err: unknown) {
    console.error("❌ POST integration api error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
