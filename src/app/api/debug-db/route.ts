import { NextResponse } from "next/server";
import { prisma } from "@/shared/lib/prisma";

export async function GET() {
  const responses = await prisma.flowResponse.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  const contact = await prisma.contact.findFirst({
    where: { phone: "+918894606932" }
  });

  const logs = await prisma.systemLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  return NextResponse.json({ responses, contactAttributes: contact?.attributes, logs });
}
