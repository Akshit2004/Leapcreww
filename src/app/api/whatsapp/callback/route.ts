import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      console.error("[WhatsApp Callback] Meta returned error:", error);
      return NextResponse.redirect(new URL("/login?whatsapp=error", request.url));
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL("/login?whatsapp=error", request.url));
    }

    // Decode state to get orgId
    let orgId: string;
    try {
      const stateData = JSON.parse(Buffer.from(state, "base64").toString());
      orgId = stateData.orgId;
    } catch {
      return NextResponse.redirect(new URL("/login?whatsapp=error", request.url));
    }

    // Exchange code for access token
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const redirectUri = `${request.nextUrl.origin}/api/whatsapp/callback`;

    if (!appId || !appSecret || !redirectUri) {
      return NextResponse.redirect(new URL(`/org/${orgId}?whatsapp=config_error`, request.url));
    }

    const tokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}`,
      { method: "GET" }
    );

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("[WhatsApp Callback] Token exchange failed:", tokenData);
      return NextResponse.redirect(new URL(`/org/${orgId}?whatsapp=token_error`, request.url));
    }

    let accessToken = tokenData.access_token;

    // Exchange short-lived token (2 hours) for a long-lived token (60 days)
    try {
      const exchangeRes = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${accessToken}`,
        { method: "GET" }
      );
      if (exchangeRes.ok) {
        const exchangeData = await exchangeRes.json();
        if (exchangeData.access_token) {
          accessToken = exchangeData.access_token;
          console.log("[WhatsApp Callback] Successfully exchanged short-lived token for long-lived 60-day token.");
        }
      } else {
        console.warn("[WhatsApp Callback] Failed to exchange for long-lived token, falling back to short-lived token:", await exchangeRes.json());
      }
    } catch (exchangeErr) {
      console.error("[WhatsApp Callback] Error exchanging for long-lived token:", exchangeErr);
    }

    // Use the token to get the WABA ID
    const debugRes = await fetch(
      `https://graph.facebook.com/v21.0/debug_token?input_token=${accessToken}&access_token=${appId}|${appSecret}`,
      { method: "GET" }
    );
    const debugData = await debugRes.json();

    if (!debugRes.ok || !debugData.data) {
      console.error("[WhatsApp Callback] Token debug failed:", debugData);
      return NextResponse.redirect(new URL(`/org/${orgId}?whatsapp=token_error`, request.url));
    }

    // The token belongs to a Business Manager / System User
    // Get the WABA IDs associated with this token
    const businessId = debugData.data.business?.id;
    let wabaId = "";
    let phoneNumberId = "";

    if (businessId) {
      // Fetch WhatsApp Business Accounts for this business
      const wabaRes = await fetch(
        `https://graph.facebook.com/v21.0/${businessId}/owned_whatsapp_business_accounts?access_token=${accessToken}`,
        { method: "GET" }
      );
      const wabaData = await wabaRes.json();

      if (wabaRes.ok && wabaData.data?.length > 0) {
        wabaId = wabaData.data[0].id;

        // Get phone numbers for the first WABA
        const phoneRes = await fetch(
          `https://graph.facebook.com/v21.0/${wabaId}/phone_numbers?access_token=${accessToken}`,
          { method: "GET" }
        );
        const phoneData = await phoneRes.json();

        if (phoneRes.ok && phoneData.data?.length > 0) {
          phoneNumberId = phoneData.data[0].id;
        }
      }
    }

    // Store credentials in the organization record
    await prisma.organization.update({
      where: { id: orgId },
      data: {
        whatsappBusinessAccountId: wabaId || null,
        whatsappPhoneNumberId: phoneNumberId || null,
        whatsappAccessToken: accessToken,
        whatsappConnected: true,
      },
    });

    console.log(`[WhatsApp Connect] Org ${orgId}: WABA=${wabaId}, PhoneID=${phoneNumberId}`);

    return NextResponse.redirect(new URL(`/org/${orgId}?whatsapp=connected`, request.url));
  } catch (err: unknown) {
    console.error("[WhatsApp Callback] Error:", err);
    return NextResponse.redirect(new URL("/login?whatsapp=error", request.url));
  }
}
