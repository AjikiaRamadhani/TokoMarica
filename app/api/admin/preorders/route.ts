import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await prisma.preOrderCampaign.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      product: { select: { id: true, name: true, slug: true, price: true } },
      _count: { select: { reservations: true } },
      reservations: {
        orderBy: { createdAt: "desc" },
        select: {
          reservationNumber: true,
          customerName: true,
          customerEmail: true,
          customerWhatsapp: true,
          quantity: true,
          totalPrice: true,
          status: true,
          paidAt: true,
          createdAt: true,
        },
      },
    },
  }));
}

export async function POST(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json() as { productId?: string; slug?: string; title?: string; description?: string; price?: number; preorderOpenAt?: string; preorderCloseAt?: string; releaseAt?: string; stockLimit?: number; status?: "DRAFT" | "PUBLISHED" | "CLOSED" | "COMPLETED" };
    if (!body.productId || !body.slug || !body.title || !body.description || typeof body.price !== "number" || !Number.isInteger(body.price) || body.price < 0 || !body.preorderOpenAt || !body.releaseAt) return NextResponse.json({ error: "Data campaign pre-order belum lengkap" }, { status: 400 });
    const product = await prisma.product.findUnique({ where: { id: body.productId.trim() }, select: { id: true } });
    if (!product) return NextResponse.json({ error: "Produk tidak ditemukan. Isi Product ID yang valid dari tabel products, bukan nama atau slug produk." }, { status: 400 });
    const campaign = await prisma.preOrderCampaign.create({ data: { productId: body.productId, slug: body.slug.trim(), title: body.title.trim(), description: body.description.trim(), price: body.price, preorderOpenAt: new Date(body.preorderOpenAt), preorderCloseAt: body.preorderCloseAt ? new Date(body.preorderCloseAt) : null, releaseAt: new Date(body.releaseAt), stockLimit: body.stockLimit ?? null, status: body.status ?? "DRAFT" } });
    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/preorders]", error);
    return NextResponse.json({ error: "Gagal membuat campaign pre-order" }, { status: 500 });
  }
}
