import { prisma } from "./prisma";
import { getGroqChatCompletion } from "./groq";
import { sendWhatsAppMessage } from "./whatsapp";
import { resolveAttribution } from "@/features/analytics/services/attribution";

interface BotMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface BotNode {
  id: string;
  type: string;
  content: string;
  options?: string[];
  nextId?: string | null;
  routes?: Record<string, string> | null;
}

interface BotContact {
  id: string;
  name: string;
  phone: string;
  tags: string[];
  assignedAgent?: string | null;
  currentNodeId?: string | null;
  organization?: { name: string };
}

interface CrmAnalysis {
  purchaseIntent: boolean;
  budget: string | null;
  interests: string[] | null;
  frustrated: boolean;
  needsEscalation: boolean;
}

function extractJsonFromString(str: string): Record<string, unknown> | null {
  try {
    const cleanStr = str.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanStr);
  } catch (err) {
    console.error("JSON Extraction failed from response:", str, err);
    const match = str.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (nestedErr) {
        console.error("Nested JSON parsing fallback also failed:", nestedErr);
      }
    }
    return null;
  }
}

async function analyzeConversationAgent(recentMessages: BotMessage[]): Promise<CrmAnalysis | null> {
  try {
    const analysisPrompt = [
      {
        role: "system",
        content: `You are an expert CRM Data & Escalation Agent for WappFlow.
Analyze the latest customer message and overall chat history. Your task is to determine customer attributes and return a structured analysis.

Specifically:
1. purchaseIntent: (boolean) Does the customer show a strong, active intent to buy our service, subscribe, or place an order?
2. budget: (string or null) If the user mentions any budget limit, amount, or price constraints (e.g. "$500", "50k INR", "1000 dollars"), extract and format it cleanly as "budget:[amount]" (e.g. "budget:$500"). If not mentioned, return null.
3. interests: (string[] or null) Did they mention any specific integrations, systems, or product interests? Extract them as lowercase formatted values e.g., "interest:shopify", "interest:woocommerce", "interest:api". If not mentioned, return null.
4. frustrated: (boolean) Does the customer display high frustration, impatience, anger, negative sentiment, or specifically mock the assistant?
5. needsEscalation: (boolean) Is this a complex technical support query, complaint, refund request, or custom requirement that an automated customer sales bot cannot resolve?

You MUST return a valid JSON object matching this schema:
{
  "purchaseIntent": boolean,
  "budget": string | null,
  "interests": string[] | null,
  "frustrated": boolean,
  "needsEscalation": boolean
}
Do not include any explanation, code fences, or markdown wrapping. Return ONLY the raw JSON string.`
      },
      {
        role: "user",
        content: `Conversation Transcript:\n${recentMessages
          .map((m) => `${m.role === "assistant" ? "Bot" : "Customer"}: ${m.content}`)
          .join("\n")}`
      }
    ];

    const resultString = await getGroqChatCompletion(analysisPrompt);
    const parsed = extractJsonFromString(resultString);
    if (parsed) {
      return {
        purchaseIntent: Boolean(parsed.purchaseIntent),
        budget: (parsed.budget as string) || null,
        interests: Array.isArray(parsed.interests) ? (parsed.interests as string[]) : null,
        frustrated: Boolean(parsed.frustrated),
        needsEscalation: Boolean(parsed.needsEscalation)
      };
    }
    return null;
  } catch (err) {
    console.error("Error in analyzeConversationAgent:", err);
    return null;
  }
}

// ─── Chatbot Node Tree Traversal ─────────────────────────────────────────────

async function sendReply(
  text: string,
  contactId: string,
  orgId: string,
  timeStr: string,
  contactName: string,
  contactPhone: string,
  buttons?: { type: "reply"; reply: { id: string; title: string } }[]
) {
  await prisma.message.create({
    data: {
      sender: "agent",
      text,
      timestamp: timeStr,
      contactId,
      organizationId: orgId,
      buttons: buttons?.map((b) => b.reply.title) || [],
    },
  });

  const truncated = text.length > 35 ? text.substring(0, 32) + "..." : text;
  await prisma.contact.update({
    where: { id: contactId },
    data: { lastMessage: truncated, lastMessageTime: timeStr },
  });

  await prisma.systemLog.create({
    data: {
      timestamp: timeStr,
      type: "chat",
      message: `Bot replied to ${contactName}: "${text.slice(0, 50)}"`,
      organizationId: orgId,
    },
  });

  const cleanPhone = contactPhone.replace(/[^0-9]/g, "");
  const result = await sendWhatsAppMessage({ to: cleanPhone, text, buttons }, orgId);
  if (!result.ok) {
    console.warn("WhatsApp dispatch failed:", result.error);
  }
}

async function advanceFlow(
  fromNodeId: string,
  nodes: BotNode[],
  contactId: string,
  orgId: string,
  timeStr: string,
  contactName: string,
  contactPhone: string
) {
  if (!fromNodeId) {
    await prisma.contact.update({
      where: { id: contactId },
      data: { currentNodeId: null },
    });
    return;
  }

  const node = nodes.find((n) => n.id === fromNodeId);
  if (!node) {
    await prisma.contact.update({
      where: { id: contactId },
      data: { currentNodeId: null },
    });
    return;
  }

  // Record impression for analytics funnel drop-off calculation
  await prisma.chatbotAnalytics.create({
    data: {
      nodeId: node.id,
      contactId,
      action: "impression",
      organizationId: orgId,
    },
  }).catch(() => {});

  if (node.type === "message") {
    await sendReply(node.content, contactId, orgId, timeStr, contactName, contactPhone);
    if (node.nextId) {
      const next = nodes.find((n) => n.id === node.nextId);
      if (next?.type === "question") {
        const btns = (next.options || []).map((opt: string, idx: number) => ({
          type: "reply" as const,
          reply: { id: `opt_${idx}`, title: opt },
        }));
        await sendReply(next.content, contactId, orgId, timeStr, contactName, contactPhone, btns);
        await prisma.contact.update({
          where: { id: contactId },
          data: { currentNodeId: next.id },
        });
      } else if (next?.type === "delay") {
        if (next.nextId) {
          await advanceFlow(next.nextId, nodes, contactId, orgId, timeStr, contactName, contactPhone);
        }
      } else {
        await advanceFlow(node.nextId, nodes, contactId, orgId, timeStr, contactName, contactPhone);
      }
    } else {
      await prisma.contact.update({
        where: { id: contactId },
        data: { currentNodeId: null },
      });
    }
  } else if (node.type === "question") {
    const btns = (node.options || []).map((opt: string, idx: number) => ({
      type: "reply" as const,
      reply: { id: `opt_${idx}`, title: opt },
    }));
    await sendReply(node.content, contactId, orgId, timeStr, contactName, contactPhone, btns);
    await prisma.contact.update({
      where: { id: contactId },
      data: { currentNodeId: node.id },
    });
  } else if (node.type === "delay") {
    if (node.nextId) {
      await advanceFlow(node.nextId, nodes, contactId, orgId, timeStr, contactName, contactPhone);
    } else {
      await prisma.contact.update({
        where: { id: contactId },
        data: { currentNodeId: null },
      });
    }
  } else {
    await prisma.contact.update({
      where: { id: contactId },
      data: { currentNodeId: null },
    });
  }
}

// ─── Free-form AI fallback (original behavior) ─────────────────────────────

async function freeFormAiReply(
  contact: BotContact,
  orgId: string,
  orgName: string,
  timeStr: string
) {
  const recentMessages = await prisma.message.findMany({
    where: { contactId: contact.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  recentMessages.reverse();

  const botContextMessages = [
    {
      role: "system",
      content: `You are an expert AI sales and support assistant for the company: "${orgName}".

Your role:
- QUALIFY leads: identify their needs, budget, timeline, and purchase intent naturally through conversation
- ANSWER questions accurately about the company's products/services
- BOOK appointments or escalate to a human agent when the prospect is ready
- NEVER make up pricing or features — say "I'll have our team share the details with you"

Special Command:
- If the customer asks to see your products, catalog, shop, or what you sell, you MUST reply with exactly this exact phrase: [SHOW_CATALOG]
- Do not add any other text when using [SHOW_CATALOG].

Response guidelines:
- Keep responses under 3-4 sentences. WhatsApp is conversational, not email.
- Use *bold* for emphasis and occasional emojis for warmth (😊 👍 🎉)
- Ask qualifying questions naturally: "What kind of setup are you looking for?", "Do you have a timeline in mind?"
- If the customer sounds ready to buy → say "Great! I'll connect you with our team to get this going."
- If you don't know the answer → "I'm not sure about that. Let me have a specialist reach out to you shortly."
- NEVER be pushy or salesy — be helpful and consultative.`,
    },
    ...recentMessages.map((m) => ({
      role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
      content: m.text,
    })),
  ];

  const botReplyText = await getGroqChatCompletion(botContextMessages);

  if (botReplyText.includes("[SHOW_CATALOG]")) {
    const { sendCatalog } = await import("./marketplace");
    await sendCatalog(contact.phone, contact.id, orgId);
  } else {
    await sendReply(botReplyText, contact.id, orgId, timeStr, contact.name, contact.phone);
  }

  const crmHistory = [
    ...recentMessages.map((m) => ({
      role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
      content: m.text,
    })),
    { role: "assistant" as const, content: botReplyText },
  ];

  console.log(`[Agentic CRM] Triggering background qualification audit for ${contact.name}...`);
  const analysis = await analyzeConversationAgent(crmHistory);
  if (analysis) {
    await applyCrmAnalysis(analysis, contact, orgId, timeStr);
  }
}

async function applyCrmAnalysis(analysis: CrmAnalysis, contact: BotContact, orgId: string, timeStr: string) {
  const updatedTags = [...contact.tags];
  let tagChanged = false;

  if (analysis.purchaseIntent && !updatedTags.includes("Hot Prospect")) {
    updatedTags.push("Hot Prospect");
    tagChanged = true;
  }
  if (analysis.budget && !updatedTags.includes(analysis.budget)) {
    updatedTags.push(analysis.budget);
    tagChanged = true;
  }
  if (analysis.interests && Array.isArray(analysis.interests)) {
    analysis.interests.forEach((item: string) => {
      if (!updatedTags.includes(item)) {
        updatedTags.push(item);
        tagChanged = true;
      }
    });
  }

  if (tagChanged) {
    await prisma.contact.update({
      where: { id: contact.id },
      data: { tags: updatedTags },
    });
    await prisma.systemLog.create({
      data: {
        timestamp: timeStr,
        type: "crm",
        message: `Autonomous CRM Agent updated tags for ${contact.name}: ${updatedTags.join(", ")}`,
        organizationId: orgId,
      },
    });
  }

  if (analysis.frustrated || analysis.needsEscalation) {
    const memberships = await prisma.membership.findMany({
      where: { organizationId: orgId },
      include: { user: true },
    });
    const escalationAgent =
      memberships.length > 0 && memberships[0].user.name
        ? memberships[0].user.name
        : "Support Team";

    await prisma.contact.update({
      where: { id: contact.id },
      data: { assignedAgent: escalationAgent },
    });

    const reason = analysis.frustrated
      ? "detected high customer frustration and negative sentiment"
      : "a complex technical/unresolved support inquiry";

    await prisma.systemLog.create({
      data: {
        timestamp: timeStr,
        type: "crm",
        message: `[Escalation Alert] Lead ${contact.name} was autonomously re-assigned to agent '${escalationAgent}' due to ${reason}.`,
        organizationId: orgId,
      },
    });

    await prisma.message.create({
      data: {
        sender: "system",
        text: `[Autonomous Escalation: Chat re-assigned to human agent '${escalationAgent}' due to ${reason}]`,
        timestamp: timeStr,
        contactId: contact.id,
        organizationId: orgId,
      },
    });

    console.log(`[Agentic CRM] Autonomously escalated contact ${contact.name} to ${escalationAgent}.`);
  }
}

async function handleReorderFlow(contact: any, orgId: string, timeStr: string): Promise<boolean> {
  const latestOrder = await prisma.order.findFirst({
    where: {
      contactId: contact.id,
      organizationId: orgId,
    },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  if (!latestOrder || latestOrder.items.length === 0) {
    await sendReply(
      "🔍 I couldn't find any previous orders for you. Feel free to type *catalog* to browse our products and place a new order!",
      contact.id,
      orgId,
      timeStr,
      contact.name,
      contact.phone
    );
    return true;
  }

  // Create a new Order in the DB based on the old order items
  const orderItemsToCreate = latestOrder.items.map((item) => ({
    productId: item.productId,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
  }));

  const total = latestOrder.total;
  const newOrderId = `ORD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  try {
    let paymentShortUrl = `https://wappflow.com/pay/sandbox/${newOrderId}?amount=${total}&phone=${contact.phone}`;
    let rzpOrderId = `plink_sim_${Math.random().toString(36).substring(2, 10)}`;

    const { getRazorpayInstance, createRazorpayPaymentLink } = await import("@/shared/lib/razorpay");
    const rzp = getRazorpayInstance();
    if (rzp) {
      try {
        const rzpLink = await createRazorpayPaymentLink(total, newOrderId, contact.phone, contact.name);
        paymentShortUrl = rzpLink.short_url;
        rzpOrderId = rzpLink.id;
      } catch (rzpErr) {
        console.warn("[Razorpay] Failed to create payment link, falling back to sandbox link:", rzpErr);
      }
    }

    const attribution = await resolveAttribution(orgId, contact);

    await prisma.order.create({
      data: {
        orderId: newOrderId,
        contactId: contact.id,
        total,
        status: "pending",
        paymentStatus: "pending",
        razorpayOrderId: rzpOrderId,
        phone: contact.phone,
        organizationId: orgId,
        address: latestOrder.address || { address: "reorder" },
        ...attribution,
        items: {
          create: orderItemsToCreate,
        },
      },
    });

    const CURRENCY_SYMBOL = "₹";
    const totalFormatted = `${CURRENCY_SYMBOL}${(total / 100).toFixed(2)}`;
    let summaryText = `🛍️ *Repurchase Last Order!*\n\nI found your previous order with these items:\n━━━━━━━━━━━━━━━━━━━\n`;
    orderItemsToCreate.forEach((item) => {
      summaryText += `*${item.name}* x${item.quantity} — ${CURRENCY_SYMBOL}${(item.price * item.quantity / 100).toFixed(2)}\n`;
    });
    summaryText += `━━━━━━━━━━━━━━━━━━━\n*Total: ${totalFormatted}*\n*Order ID:* ${newOrderId}\n\n💳 *Pay online to place your order:*\n${paymentShortUrl}\n\nSimply click the link above to pay and place your order immediately!`;

    await sendReply(summaryText, contact.id, orgId, timeStr, contact.name, contact.phone, [
      { type: "reply", reply: { id: "confirm_order", title: "✅ Paid" } },
      { type: "reply", reply: { id: "menu", title: "🏠 Menu" } },
    ]);

    return true;
  } catch (err) {
    console.error("Error creating re-order payment link:", err);
    await sendReply(
      "⚠️ Sorry, I ran into an error setting up your payment link. Please try again in a moment or contact our support.",
      contact.id,
      orgId,
      timeStr,
      contact.name,
      contact.phone
    );
    return true;
  }
}

// ─── Main Entry Point ───────────────────────────────────────────────────────

export async function handleAutoResponder(contactId: string, orgId: string) {
  try {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: { organization: true },
    });

    if (!contact || contact.assignedAgent !== "Bot") return;

    const orgName = contact.organization.name;
    const d = new Date();
    const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

    // Intercept buy again / reorder intent
    const lastMsg = await prisma.message.findFirst({
      where: { contactId: contact.id, sender: "user" },
      orderBy: { createdAt: "desc" },
    });

    if (lastMsg) {
      const incomingText = lastMsg.text.trim().toLowerCase();
      let isReorderIntent = ["buy again", "reorder", "order again", "repurchase"].some((kw) =>
        incomingText.includes(kw)
      ) || lastMsg.text === "buy_again" || lastMsg.text === "reorder";

      if (!isReorderIntent) {
        try {
          const intentPrompt = [
            {
              role: "system",
              content: `You are an intent classification engine. Does the following user message represent a clear desire to buy their previous order again, repurchase items they bought before, or reorder?
              Reply ONLY with the exact word "true" or "false". No explanations.`
            },
            {
              role: "user",
              content: `User message: "${incomingText}"`
            }
          ];
          const response = await getGroqChatCompletion(intentPrompt);
          isReorderIntent = response.toLowerCase().includes("true");
        } catch (err) {
          console.error("Semantic reorder intent classification failed:", err);
        }
      }

      if (isReorderIntent) {
        const handled = await handleReorderFlow(contact, orgId, timeStr);
        if (handled) return;
      }
    }

    // 1. Try chatbot node tree flow if builder is enabled
    if (contact.organization.chatbotBuilderEnabled) {
      const nodes = await prisma.chatbotNode.findMany({
        where: { organizationId: orgId },
        orderBy: { id: "asc" },
      });

      if (nodes.length > 0) {
        const handled = await handleNodeFlow(contact, nodes as unknown as BotNode[], orgId, timeStr);
        if (handled) return;
      }
    }

    // 2. Fall back to free-form AI
    await freeFormAiReply(contact, orgId, orgName, timeStr);
  } catch (error: unknown) {
    console.error("Error in handleAutoResponder:", error);
    try {
      const d = new Date();
      const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      await prisma.systemLog.create({
        data: {
          timestamp: timeStr,
          type: "chat",
          message: `AI Bot Error: ${error instanceof Error ? (error instanceof Error ? error.message : String(error)) : "Unknown error"}`,
          organizationId: orgId,
        },
      });
    } catch (logErr) {
      console.error("Failed to write error log to DB:", logErr);
    }
  }
}

async function handleNodeFlow(
  contact: BotContact,
  nodes: BotNode[],
  orgId: string,
  timeStr: string
): Promise<boolean> {
  const lastMsg = await prisma.message.findFirst({
    where: { contactId: contact.id, sender: "user" },
    orderBy: { createdAt: "desc" },
  });
  if (!lastMsg) return false;

  const incomingText = lastMsg.text.trim().toLowerCase();

  if (!contact.currentNodeId) {
    // No active flow — check trigger match
    const trigger = nodes.find((n) => n.id === "n1" && n.type === "trigger");
    if (!trigger) return false;

    const triggerPhrase = trigger.content.toLowerCase().trim();
    if (!triggerPhrase) return false;

    // 1. Fast exact/substring match
    let isMatch = incomingText.includes(triggerPhrase);

    // 2. Semantic AI Intent Match (if fast match fails)
    if (!isMatch) {
      try {
        const intentPrompt = [
          {
            role: "system",
            content: `You are an intent classification engine. The user wants to trigger a workflow defined by the phrase/intent: "${triggerPhrase}".
Does the following user message match this intent, mean the same thing, or represent a clear desire to start this process?
Reply ONLY with the exact word "true" or "false". No explanations.`
          },
          {
            role: "user",
            content: `User message: "${incomingText}"`
          }
        ];
        // Note: getGroqChatCompletion is already imported at the top of the file
        const response = await getGroqChatCompletion(intentPrompt);
        isMatch = response.toLowerCase().includes("true");
      } catch (err) {
        console.error("Semantic intent match failed:", err);
      }
    }

    if (!isMatch) return false;

    // Trigger matched — advance along the flow
    if (trigger.nextId) {
      await advanceFlow(trigger.nextId, nodes, contact.id, orgId, timeStr, contact.name, contact.phone);
      // Run CRM analysis after flow reply
      await runCrmAnalysis(contact, orgId, timeStr);
    }
    return true;
  }

  // Resume from currentNodeId
  const currentNode = nodes.find((n) => n.id === contact.currentNodeId);
  if (!currentNode) {
    await prisma.contact.update({
      where: { id: contact.id },
      data: { currentNodeId: null },
    });
    return false;
  }

  if (currentNode.type === "question") {
    const options = currentNode.options || [];
    const routes = (currentNode.routes as Record<string, string>) || {};

    let matchedOption: string | null = null;
    for (const opt of options) {
      if (incomingText.includes(opt.toLowerCase())) {
        matchedOption = opt;
        break;
      }
    }

    // Also try exact match if contains didn't work
    if (!matchedOption) {
      for (const opt of options) {
        if (opt.toLowerCase() === incomingText) {
          matchedOption = opt;
          break;
        }
      }
    }

    if (matchedOption && routes[matchedOption]) {
      // Record response for analytics funnel calculations
      await prisma.chatbotAnalytics.create({
        data: {
          nodeId: currentNode.id,
          contactId: contact.id,
          action: "response",
          organizationId: orgId,
        },
      }).catch(() => {});

      await prisma.contact.update({
        where: { id: contact.id },
        data: { currentNodeId: null },
      });
      await advanceFlow(routes[matchedOption], nodes, contact.id, orgId, timeStr, contact.name, contact.phone);
      await runCrmAnalysis(contact, orgId, timeStr);
      return true;
    }

    // No option matched — re-ask the question
    const btns = (currentNode.options || []).map((opt: string, idx: number) => ({
      type: "reply" as const,
      reply: { id: `opt_${idx}`, title: opt },
    }));
    await sendReply(
      `I didn't understand that. ${currentNode.content}`,
      contact.id,
      orgId,
      timeStr,
      contact.name,
      contact.phone,
      btns
    );
    await prisma.contact.update({
      where: { id: contact.id },
      data: { currentNodeId: currentNode.id },
    });
    return true;
  }

  // Non-question node with active currentNodeId — execute and advance
  await prisma.contact.update({
    where: { id: contact.id },
    data: { currentNodeId: null },
  });
  await advanceFlow(currentNode.id, nodes, contact.id, orgId, timeStr, contact.name, contact.phone);
  await runCrmAnalysis(contact, orgId, timeStr);
  return true;
}

async function runCrmAnalysis(contact: BotContact, orgId: string, timeStr: string) {
  try {
    const recentMessages = await prisma.message.findMany({
      where: { contactId: contact.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    recentMessages.reverse();

    const crmHistory = recentMessages.map((m) => ({
      role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
      content: m.text,
    }));

    const analysis = await analyzeConversationAgent(crmHistory);
    if (analysis) {
      await applyCrmAnalysis(analysis, contact, orgId, timeStr);
    }
  } catch (err) {
    console.error("CRM analysis failed:", err);
  }
}
