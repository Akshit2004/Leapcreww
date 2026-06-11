import { prisma } from "@/shared/lib/prisma";

export interface CannedReplyCreate {
  shortcut: string;
  title: string;
  body: string;
  organizationId: string;
}

export function listByOrg(organizationId: string) {
  return prisma.cannedReply.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
  });
}

export function create(data: CannedReplyCreate) {
  return prisma.cannedReply.create({ data });
}

export function remove(id: string, organizationId: string) {
  return prisma.cannedReply.deleteMany({ where: { id, organizationId } });
}
