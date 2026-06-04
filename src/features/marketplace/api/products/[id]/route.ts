import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  return NextResponse.json({ product });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, body] = await Promise.all([params, req.json()]);
  const product = await prisma.product.update({
    where: { id },
    data: {
      sku: body.sku !== undefined ? body.sku : undefined,
      name: body.name,
      description: body.description,
      price: body.price,
      images: body.images,
      category: body.category,
      stock: body.stock,
      isActive: body.isActive,
    },
  });

  // Sync to Meta Catalog
  import("@/shared/lib/meta-catalog").then((m) => m.syncProductToMetaCatalog(product.id));

  return NextResponse.json({ product });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (product) {
    await prisma.product.delete({ where: { id } });
    import("@/shared/lib/meta-catalog").then((m) => m.deleteProductFromMetaCatalog(product.id, product.organizationId, product.sku));
  }
  return NextResponse.json({ status: "deleted" });
}