import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const orgId = searchParams.get("orgId");
  const category = searchParams.get("category");

  if (!orgId) {
    return NextResponse.json({ error: "orgId required" }, { status: 400 });
  }

  const where: any = { organizationId: orgId, isActive: true };
  if (category) where.category = category;

  const products = await prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const categories = await prisma.product.findMany({
    where: { organizationId: orgId, isActive: true },
    select: { category: true },
    distinct: ["category"],
  });

  return NextResponse.json({
    products,
    categories: [...new Set(categories.map((c) => c.category))],
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, description, price, images, category, stock, organizationId } = body;

  if (!name || !price || !category || !organizationId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const product = await prisma.product.create({
    data: {
      name,
      description: description || "",
      price,
      images: images || [],
      category,
      stock: stock ?? 0,
      organizationId,
    },
  });

  return NextResponse.json({ product }, { status: 201 });
}
