import * as contactRepo from "../../contacts/repositories/contactRepo";
import { prisma } from "@/shared/lib/prisma";

export async function handleNfmReply(
  contactId: string,
  orgId: string,
  nfmReply: { responseJson: string; flowName: string }
) {
  try {
    const parsedData = JSON.parse(nfmReply.responseJson);
    await contactRepo.updateAttributes(contactId, parsedData);

    // Find the flow using the name suffix
    const parts = nfmReply.flowName.split("_");
    const suffixId = parts[parts.length - 1];

    if (suffixId) {
      const flow = await prisma.flow.findFirst({
        where: {
          organizationId: orgId,
          id: { startsWith: suffixId },
        },
      });

      if (flow) {
        await prisma.flowResponse.create({
          data: {
            flowId: flow.id,
            contactId,
            submittedData: parsedData,
            organizationId: orgId,
          },
        });
      }
    }

    const d = new Date();
    const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

    await prisma.systemLog.create({
      data: {
        timestamp: timeStr,
        type: "crm",
        message: `📋 Form Submitted: Flow response recorded for contact.`,
        organizationId: orgId,
      },
    });

    return true;
  } catch (err) {
    console.error("[Webhook Service] Failed to parse/handle nfm_reply:", err);
    return false;
  }
}
