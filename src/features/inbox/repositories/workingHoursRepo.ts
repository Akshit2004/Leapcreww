import { prisma } from "@/shared/lib/prisma";

export function getWorkingHours(organizationId: string) {
  return prisma.organization.findUnique({
    where: { id: organizationId },
    select: { workingHours: true },
  });
}

export function updateWorkingHours(organizationId: string, workingHours: object) {
  return prisma.organization.update({
    where: { id: organizationId },
    data: { workingHours },
  });
}
