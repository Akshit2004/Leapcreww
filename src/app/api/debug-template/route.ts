import { NextResponse } from "next/server";
import { prisma } from "@/shared/lib/prisma";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const t = await prisma.template.findUnique({ where: { id } });
  return NextResponse.json(t);
}
