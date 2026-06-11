import * as contactRepo from "../../contacts/repositories/contactRepo";
import { prisma } from "@/shared/lib/prisma";

export async function handleNfmReply(
  contactId: string,
  orgId: string,
  nfmReply: { responseJson: string }
) {
  try {
    const rawJsonStr = nfmReply.responseJson;
    const parsedData = JSON.parse(rawJsonStr);

    // We embed the local Flow id in the flow_token when sending the flow
    // (format: "flow_<flowId>_..."), and Meta echoes flow_token back in the
    // response so we can correlate the reply with the originating flow.
    // Matching against the raw JSON string (rather than a specific key) keeps
    // this resilient to however/wherever Meta places the token in the payload.
    const flowIdMatch = rawJsonStr.match(/flow_([0-9a-fA-F-]{36})_/);

    // Strip the token before persisting — it's routing metadata, not form data.
    const formData = { ...parsedData };
    delete formData.flow_token;

    // Some flow screens wrap submitted fields in a nested "form_<screen>"
    // object — unwrap it so the captured data is flat and readable.
    let finalData = formData;
    const formKeys = Object.keys(formData).filter((key) => key.startsWith("form_"));
    if (formKeys.length === 1 && typeof formData[formKeys[0]] === "object" && formData[formKeys[0]] !== null) {
      finalData = { ...formData[formKeys[0]] };
    }

    await contactRepo.updateAttributes(contactId, finalData);

    let flowMatched = false;
    if (flowIdMatch) {
      const flow = await prisma.flow.findFirst({
        where: { id: flowIdMatch[1], organizationId: orgId },
      });

      if (flow) {
        flowMatched = true;
        await prisma.flowResponse.create({
          data: {
            flowId: flow.id,
            contactId,
            submittedData: finalData,
            organizationId: orgId,
          },
        });
      }
    }

    await prisma.systemLog.create({
      data: {
        type: "crm",
        message: flowMatched
          ? `📋 Form Submitted: Flow response recorded for contact.`
          : `⚠️ Flow response received but could not be matched to a Flow (no flow_token in payload).`,
        organizationId: orgId,
      },
    });

    return true;
  } catch (err) {
    console.error("[Webhook Service] Failed to parse/handle nfm_reply:", err);
    return false;
  }
}
