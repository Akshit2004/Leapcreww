import { NextRequest } from "next/server";
import { prisma } from "@/shared/lib/prisma";
import { requireOrg, ok, route, body } from "@/shared/lib/api";

export const GET = route(async (req, { params }) => {
  const orgId = params!.orgId;
  await requireOrg(orgId, "AGENT");

  const flows = await prisma.flow.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
  });

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { flowsPublicKeyUploaded: true },
  });

  return ok({ 
    flows,
    encryptionSetup: org?.flowsPublicKeyUploaded || false 
  });
});

export const POST = route(async (req, { params }) => {
  const orgId = params!.orgId;
  await requireOrg(orgId, "ADMIN");

  const data = await body<any>(req);
  const flow = await prisma.flow.create({
    data: {
      name: data.name || "New Flow",
      category: data.category || "LEAD_GENERATION",
      flowJson: data.flowJson || {},
      organizationId: orgId,
    },
  });

  return ok({ flow });
});
